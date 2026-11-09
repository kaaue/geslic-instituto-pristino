// Acesso ao sistema (Protótipo 1): conta individual, por login (ou e-mail) e
// senha. Depois de entrar, volta para a tela que a pessoa tentou abrir.

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import PaginaAutenticacao from '../../components/common/PaginaAutenticacao.jsx';
import Campo from '../../components/common/Campo.jsx';
import { mensagemDeErro } from '../../services/api';

export default function LoginPage() {
  const { entrar, aviso } = useAuth();
  const navegar = useNavigate();
  const local = useLocation();
  const [form, setForm] = useState({ login: '', senha: '' });
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    const faltando = {};
    if (!form.login.trim()) faltando.login = 'Informe o login ou e-mail.';
    if (!form.senha) faltando.senha = 'Informe a senha.';
    setErros(faltando);
    setErro('');
    if (Object.keys(faltando).length) return;

    setEntrando(true);
    try {
      const conta = await entrar(form.login.trim(), form.senha);
      const destino = conta.troca_senha_obrigatoria ? '/minha-conta' : (local.state?.de || '/');
      navegar(destino, { replace: true });
    } catch (e) {
      setErros(e.corpo?.erros || {});
      setErro(e.corpo?.erros ? '' : mensagemDeErro(e, 'Não foi possível entrar.'));
      setForm((atual) => ({ ...atual, senha: '' }));
      setEntrando(false);
    }
  }

  return (
    <PaginaAutenticacao titulo="Entrar no sistema" subtitulo="Use sua conta individual do GESLIC.">
      {aviso && !erro && <div className="mensagem mensagem-aviso" role="status">{aviso}</div>}
      {erro && <div className="mensagem mensagem-erro" role="alert">{erro}</div>}

      <form className="formulario-autenticacao" onSubmit={enviar} noValidate>
        <Campo rotulo="Login ou e-mail" erro={erros.login}>
          <input
            type="text"
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
            autoComplete="username"
            autoFocus
            className={erros.login ? 'com-erro' : ''}
          />
        </Campo>
        <Campo rotulo="Senha" erro={erros.senha}>
          <input
            type="password"
            value={form.senha}
            onChange={(e) => setForm({ ...form, senha: e.target.value })}
            autoComplete="current-password"
            className={erros.senha ? 'com-erro' : ''}
          />
        </Campo>
        <button type="submit" className="botao-principal" disabled={entrando}>
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="links-autenticacao">
        <Link to="/esqueci-senha">Esqueci minha senha</Link>
        <Link to="/solicitar-acesso">Solicitar acesso</Link>
      </div>
    </PaginaAutenticacao>
  );
}
