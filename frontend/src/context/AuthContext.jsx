// Estado global de autenticação.
//
// A conta, o perfil e as permissões vêm sempre da API (GET /api/auth/me), que
// confere a sessão no banco a cada requisição. Ao recarregar a página, a
// sessão é restaurada por essa mesma consulta: o token fica num cookie
// HttpOnly que o JavaScript não lê. A interface usa `pode()` só para mostrar
// ou esconder telas e botões; quem aplica a regra é a API (401/403).

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService';
import { EVENTO_SESSAO_ENCERRADA, EVENTO_TROCA_SENHA } from '../services/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // Enquanto a sessão é conferida com a API, as rotas protegidas aguardam
  const [carregando, setCarregando] = useState(true);
  // Motivo de ter voltado ao login (sessão expirada, encerrada...), mostrado na tela de login
  const [aviso, setAviso] = useState(null);

  // Relê a conta na API: perfil e permissões atualizados, ou fim da sessão
  const recarregar = useCallback(async () => {
    try {
      const { usuario: conta } = await authService.contaAtual();
      setUsuario(conta);
      return conta;
    } catch (erro) {
      if (erro.status === 401) setUsuario(null);
      return null;
    }
  }, []);

  useEffect(() => {
    recarregar().finally(() => setCarregando(false));
  }, [recarregar]);

  // services/api.js avisa quando a API recusa a sessão (401) ou exige a troca de senha
  useEffect(() => {
    function sessaoEncerrada(evento) {
      setUsuario((atual) => {
        if (atual) setAviso(evento.detail || 'Sua sessão terminou. Entre novamente.');
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
    const { usuario: conta } = await authService.entrar(login, senha);
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
