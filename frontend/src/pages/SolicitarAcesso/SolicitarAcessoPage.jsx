// Solicitação de acesso (autocadastro). A conta nasce pendente, como
// Operador, e só entra no sistema depois que um Administrador aprovar.
// Setor e cargo identificam o colaborador: na aprovação, o Administrador
// liga a conta a um cadastro existente ou cria o colaborador com esses dados,
// sem precisar passar pela tela de colaboradores. Nada é criado antes da
// aprovação.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PaginaAutenticacao from '../../components/common/PaginaAutenticacao.jsx';
import Campo from '../../components/common/Campo.jsx';
import CampoSenha from '../../components/common/CampoSenha.jsx';
import { solicitarAcesso, setoresDaSolicitacao } from '../../services/authService';
import { mensagemDeErro } from '../../services/api';
import { errosDeSenha } from '../../utils/senha';

const VAZIO = { nome: '', email: '', login: '', id_setor: '', cargo: '', senha: '', confirmacao: '' };
const FORMATO_LOGIN = /^[a-z0-9][a-z0-9._-]{2,39}$/;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mesmas regras da API (models/usuarioValidacao.js); a API confere de novo
function validar(form) {
  const erros = {};
  const nome = form.nome.trim();
  if (nome.length < 3) erros.nome = 'Informe o nome completo (ao menos 3 caracteres).';
  if (!FORMATO_EMAIL.test(form.email.trim())) erros.email = 'Informe um e-mail válido.';
  // RN41: somente o correio institucional (a API confere de novo)
  else if (!form.email.trim().toLowerCase().endsWith('@pristino.org.br')) erros.email = 'Use o e-mail institucional (@pristino.org.br).';
  if (!FORMATO_LOGIN.test(form.login.trim().toLowerCase())) {
    erros.login = 'Use de 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.';
  }
  if (!form.id_setor) erros.id_setor = 'Selecione o seu setor.';
  return { ...erros, ...errosDeSenha(form.senha, form.confirmacao) };
}

export default function SolicitarAcessoPage() {
  const [form, setForm] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [setores, setSetores] = useState([]);

  useEffect(() => {
    setoresDaSolicitacao().then(setSetores).catch(() => setSetores([]));
  }, []);

  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  async function enviar(evento) {
    evento.preventDefault();
    const encontrados = validar(form);
    setErros(encontrados);
    setErro('');
    if (Object.keys(encontrados).length) return;

    setEnviando(true);
    try {
      const { mensagem } = await solicitarAcesso({
        ...form, login: form.login.trim().toLowerCase(), id_setor: Number(form.id_setor)
      });
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
          <Campo rotulo="E-mail institucional" erro={erros.email} dica="Somente endereços @pristino.org.br são aceitos.">

            <input type="email" value={form.email} onChange={mudar('email')} autoComplete="email" className={erros.email ? 'com-erro' : ''} />
          </Campo>
          <Campo rotulo="Login" erro={erros.login} dica="Ex.: maria.silva">
            <input type="text" value={form.login} onChange={mudar('login')} autoComplete="username" className={erros.login ? 'com-erro' : ''} />
          </Campo>
        </div>
        <div className="dupla">
          <Campo rotulo="Setor" erro={erros.id_setor}>
            <select value={form.id_setor} onChange={mudar('id_setor')} className={erros.id_setor ? 'com-erro' : ''}>
              <option value="">Selecione</option>
              {setores.map((s) => <option key={s.id_setor} value={s.id_setor}>{s.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Cargo (opcional)" erro={erros.cargo}>
            <input type="text" value={form.cargo} maxLength={80} onChange={mudar('cargo')} autoComplete="organization-title" />
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
          Setor e cargo servem para o Administrador identificar o seu cadastro de colaborador
          na aprovação. O perfil de acesso também é definido nesse momento.
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
