// Estado global de autenticação.
//
// A conta, o perfil e as permissões vêm sempre da API (GET /api/auth/me), que
// confere a sessão no banco a cada requisição. Ao recarregar a página, a
// sessão é restaurada por essa mesma consulta: o token fica num cookie
// HttpOnly que o JavaScript não lê. A interface usa `pode()` só para mostrar
// ou esconder telas e botões; quem aplica a regra é a API (401/403).

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as authService from '../services/authService';
import { EVENTO_SESSAO_ENCERRADA, EVENTO_TROCA_SENHA } from '../services/api';

export const AuthContext = createContext(null);

// RN32: a sessão termina após dez minutos sem atividade humana. A tela
// observa teclado, mouse, toque e rolagem; enquanto há atividade, avisa a
// API no máximo uma vez por minuto (as consultas automáticas não contam).
// Parada além do limite, volta ao login com a explicação.
const EVENTOS_DE_ATIVIDADE = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'wheel'];
const CONFERIR_A_CADA_MS = 15000;
const AVISAR_API_A_CADA_MS = 60000;

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Enquanto a sessão é conferida com a API, as rotas protegidas aguardam
  const [carregando, setCarregando] = useState(true);
  // Motivo de ter voltado ao login (sessão expirada, encerrada...), mostrado na tela de login
  const [aviso, setAviso] = useState(null);
  const [inatividadeMinutos, setInatividadeMinutos] = useState(10);
  const ultimaAtividade = useRef(Date.now());
  const ultimoAvisoApi = useRef(Date.now());

  // Relê a conta na API: perfil e permissões atualizados, ou fim da sessão
  const recarregar = useCallback(async () => {
    try {
      const { usuario: conta, sessao } = await authService.contaAtual();
      setUsuario(conta);
      if (sessao?.inatividade_minutos) setInatividadeMinutos(sessao.inatividade_minutos);
      return conta;
    } catch (erro) {
      if (erro.status === 401) setUsuario(null);
      return null;
    }
  }, []);

  useEffect(() => {
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  // Atividade humana e expiração por inatividade (RN32)
  const idConta = usuario?.id_usuario;
  useEffect(() => {
    if (!idConta) return undefined;
    ultimaAtividade.current = Date.now();
    ultimoAvisoApi.current = Date.now();
    const marcar = () => { ultimaAtividade.current = Date.now(); };
    EVENTOS_DE_ATIVIDADE.forEach((nome) => window.addEventListener(nome, marcar, { passive: true }));

    const temporizador = setInterval(() => {
      const agora = Date.now();
      if (agora - ultimaAtividade.current >= inatividadeMinutos * 60000) {
        setAviso(`Sua sessão foi encerrada após ${inatividadeMinutos} minutos sem atividade. Entre novamente.`);
        setUsuario(null);
        authService.sair().catch(() => {});
        return;
      }
      if (ultimaAtividade.current > ultimoAvisoApi.current && agora - ultimoAvisoApi.current >= AVISAR_API_A_CADA_MS) {
        ultimoAvisoApi.current = agora;
        authService.registrarAtividade().catch(() => {});
      }
    }, CONFERIR_A_CADA_MS);

    return () => {
      EVENTOS_DE_ATIVIDADE.forEach((nome) => window.removeEventListener(nome, marcar));
      clearInterval(temporizador);
    };
  }, [idConta, inatividadeMinutos]);

  // services/api.js avisa quando a API recusa a sessão (401) ou exige a troca de senha
  useEffect(() => {
    function sessaoEncerrada(evento) {
      setUsuario((atual) => {
        if (atual) setAviso(evento.detail?.mensagem || 'Sua sessão terminou. Entre novamente.');
        return null;
      });
    }
    window.addEventListener(EVENTO_SESSAO_ENCERRADA, sessaoEncerrada);
    window.addEventListener(EVENTO_TROCA_SENHA, recarregar);
    // Ao voltar para a aba, confere se a conta ou as permissões mudaram
    window.addEventListener('focus', recarregar);
    return () => {
      window.removeEventListener(EVENTO_SESSAO_ENCERRADA, sessaoEncerrada);
      window.removeEventListener(EVENTO_TROCA_SENHA, recarregar);
      window.removeEventListener('focus', recarregar);
    };
  }, [recarregar]);

  const entrar = useCallback(async (login, senha) => {
    const { usuario: conta, sessao } = await authService.entrar(login, senha);
    if (sessao?.inatividade_minutos) setInatividadeMinutos(sessao.inatividade_minutos);
    setAviso(null);
    setUsuario(conta);
    return conta;
  }, []);

  const sair = useCallback(async () => {
    try {
      await authService.sair();
    } finally {
      setAviso(null);
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(() => ({
    usuario,
    carregando,
    aviso,
    autenticado: Boolean(usuario),
    trocaSenhaObrigatoria: Boolean(usuario?.troca_senha_obrigatoria),
    pode: (codigo) => !codigo || Boolean(usuario?.permissoes?.includes(codigo)),
    entrar,
    sair,
    recarregar,
    atualizarUsuario: setUsuario
  }), [usuario, carregando, aviso, entrar, sair, recarregar]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
