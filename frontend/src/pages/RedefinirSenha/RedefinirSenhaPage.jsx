// Redefinir senha, aberta pelo link enviado por e-mail.
// O token vem depois do # (não vai para o servidor web nem para o Referer) e
// é retirado do endereço assim que lido. Redefinir encerra todas as sessões
// da conta, inclusive a deste navegador, se houver.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import PaginaAutenticacao from '../../components/common/PaginaAutenticacao.jsx';
import CampoSenha from '../../components/common/CampoSenha.jsx';
import { redefinirSenha } from '../../services/authService';
import { mensagemDeErro } from '../../services/api';
import { errosDeSenha } from '../../utils/senha';

const lerToken = () => new URLSearchParams(window.location.hash.slice(1)).get('token') || '';

export default function RedefinirSenhaPage() {
  const { atualizarUsuario } = useAuth();
  const [token] = useState(lerToken);

  // Tira o token do endereço (histórico e barra) depois de lido
  useEffect(() => {
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);
  const [form, setForm] = useState({ senha: '', confirmacao: '' });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState(token ? '' : 'Link de redefinição ausente ou incompleto. Abra o link recebido por e-mail.');
  const [concluido, setConcluido] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    const encontrados = errosDeSenha(form.senha, form.confirmacao);
    setErros(encontrados);
    setErro('');
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      const { mensagem } = await redefinirSenha(token, form.senha, form.confirmacao);
      // as sessões da conta foram encerradas no servidor
      atualizarUsuario(null);
      setConcluido(mensagem);
    } catch (e) {
      setErros(e.corpo?.erros || {});
      if (!e.corpo?.erros) setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <PaginaAutenticacao titulo="Senha redefinida">
        <div className="mensagem mensagem-sucesso" role="status">{concluido}</div>
        <Link to="/login" className="botao-principal botao-bloco">Ir para o login</Link>
      </PaginaAutenticacao>
    );
  }

  return (
    <PaginaAutenticacao titulo="Redefinir senha" subtitulo="Escolha a nova senha da sua conta.">
      {erro && <div className="mensagem mensagem-erro" role="alert">{erro}</div>}
      {token && (
        <form className="formulario-autenticacao" onSubmit={enviar} noValidate>
          <CampoSenha rotulo="Nova senha" valor={form.senha} aoMudar={(v) => setForm({ ...form, senha: v })} erro={erros.senha} />
          <CampoSenha
            rotulo="Confirmação da nova senha"
            valor={form.confirmacao}
            aoMudar={(v) => setForm({ ...form, confirmacao: v })}
            erro={erros.confirmacao}
            comRequisitos={false}
          />
          <button type="submit" className="botao-principal" disabled={enviando}>
            {enviando ? 'Salvando...' : 'Redefinir senha'}
          </button>
        </form>
      )}
      <div className="links-autenticacao">
        <Link to="/esqueci-senha">Pedir um novo link</Link>
        <Link to="/login">Voltar para o login</Link>
      </div>
    </PaginaAutenticacao>
  );
}
