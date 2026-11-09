// Solicitação de acesso (autocadastro). A conta nasce pendente, como
// Operador, e só entra no sistema depois que um Administrador aprovar,
// escolhendo o perfil e, se for o caso, o colaborador vinculado.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import PaginaAutenticacao from '../../components/common/PaginaAutenticacao.jsx';
import Campo from '../../components/common/Campo.jsx';
import CampoSenha from '../../components/common/CampoSenha.jsx';
import { solicitarAcesso } from '../../services/authService';
import { mensagemDeErro } from '../../services/api';
import { errosDeSenha } from '../../utils/senha';

const VAZIO = { nome: '', email: '', login: '', senha: '', confirmacao: '' };
const FORMATO_LOGIN = /^[a-z0-9][a-z0-9._-]{2,39}$/;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mesmas regras da API (models/usuarioValidacao.js); a API confere de novo
function validar(form) {
  const erros = {};
  const nome = form.nome.trim();
  if (nome.length < 3) erros.nome = 'Informe o nome completo (ao menos 3 caracteres).';
  if (!FORMATO_EMAIL.test(form.email.trim())) erros.email = 'Informe um e-mail válido.';
  if (!FORMATO_LOGIN.test(form.login.trim().toLowerCase())) {
    erros.login = 'Use de 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.';
  }
  return { ...erros, ...errosDeSenha(form.senha, form.confirmacao) };
}

export default function SolicitarAcessoPage() {
  const [form, setForm] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState('');
  const [enviando, setEnviando] = useState(false);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function enviar(evento) {
    evento.preventDefault();
    const encontrados = validar(form);
    setErros(encontrados);
    setErro('');
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      const { mensagem } = await solicitarAcesso({ ...form, login: form.login.trim().toLowerCase() });
      setEnviado(mensagem);
    } catch (e) {
      setErros(e.corpo?.erros || {});
      if (!e.corpo?.erros) setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <PaginaAutenticacao titulo="Solicitação enviada">
        <div className="mensagem mensagem-sucesso" role="status">{enviado}</div>
        <Link to="/login" className="botao-principal botao-bloco">Voltar para o login</Link>
      </PaginaAutenticacao>
    );
  }

  return (
    <PaginaAutenticacao
      titulo="Solicitar acesso"
      subtitulo="Preencha seus dados. O acesso é liberado depois que um Administrador aprovar a solicitação."
      larga
    >
      {erro && <div className="mensagem mensagem-erro" role="alert">{erro}</div>}
      <form className="formulario-autenticacao" onSubmit={enviar} noValidate>
        <Campo rotulo="Nome completo" erro={erros.nome}>
          <input type="text" value={form.nome} onChange={mudar('nome')} autoComplete="name" className={erros.nome ? 'com-erro' : ''} />
        </Campo>
        <div className="dupla">
          <Campo rotulo="E-mail" erro={erros.email}>
            <input type="email" value={form.email} onChange={mudar('email')} autoComplete="email" className={erros.email ? 'com-erro' : ''} />
          </Campo>
          <Campo rotulo="Login" erro={erros.login} dica="Ex.: maria.silva">
            <input type="text" value={form.login} onChange={mudar('login')} autoComplete="username" className={erros.login ? 'com-erro' : ''} />
          </Campo>
        </div>
        <div className="dupla">
          <CampoSenha valor={form.senha} aoMudar={(v) => setForm({ ...form, senha: v })} erro={erros.senha} />
          <CampoSenha
            rotulo="Confirmação da senha"
            valor={form.confirmacao}
            aoMudar={(v) => setForm({ ...form, confirmacao: v })}
            erro={erros.confirmacao}
            comRequisitos={false}
          />
        </div>
        <p className="nota">
          O perfil de acesso e o vínculo com o cadastro de colaborador são definidos pelo
          Administrador na aprovação.
        </p>
        <button type="submit" className="botao-principal" disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar solicitação'}
        </button>
      </form>
      <div className="links-autenticacao">
        <Link to="/login">Já tenho conta</Link>
      </div>
    </PaginaAutenticacao>
  );
}
