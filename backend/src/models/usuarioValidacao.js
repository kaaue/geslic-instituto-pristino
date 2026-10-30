// Validações das contas de acesso (RF_B9): autocadastro, criação e edição
// pelo Administrador, troca e redefinição de senha.
// Formato igual às demais validações: devolvem { dados, erros }, com erros no
// formato campo -> mensagem. As mesmas regras estão na interface.

const { normalizarTexto, textoOuNulo, dataValida, hoje } = require('../utils/normalizacao');
const { problemaNaSenha } = require('../utils/senha');

// Login: minúsculas, números, ponto, hífen e sublinhado; começa com letra ou número
const FORMATO_LOGIN = /^[a-z0-9][a-z0-9._-]{2,39}$/;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizarLogin = (valor) => String(valor ?? '').trim().toLowerCase();
const normalizarEmail = (valor) => String(valor ?? '').trim().toLowerCase();

// Nome, e-mail e login: comuns ao autocadastro e à edição pelo Administrador
function validarIdentificacao(corpo, erros) {
  const nome = normalizarTexto(corpo.nome);
  const email = normalizarEmail(corpo.email);
  const login = normalizarLogin(corpo.login);

  if (!nome) erros.nome = 'O nome é obrigatório.';
  else if (nome.length < 3) erros.nome = 'O nome deve ter ao menos 3 caracteres.';
  else if (nome.length > 120) erros.nome = 'O nome deve ter no máximo 120 caracteres.';

  if (!email) erros.email = 'O e-mail é obrigatório.';
  else if (email.length > 120 || !FORMATO_EMAIL.test(email)) erros.email = 'Informe um e-mail válido.';

  if (!login) erros.login = 'O login é obrigatório.';
  else if (!FORMATO_LOGIN.test(login)) {
    erros.login = 'Use de 3 a 40 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado.';
  }
  return { nome, email, login };
}

// Senha nova e confirmação
function validarNovaSenha(senha, confirmacao, erros, campo = 'senha') {
  const problema = problemaNaSenha(senha);
  if (problema) erros[campo] = problema;
  else if (senha !== confirmacao) erros.confirmacao = 'A confirmação não confere com a senha.';
}

// Autocadastro (público). Perfil, situação e colaborador NÃO vêm daqui: a
// conta nasce pendente, como Operador, e o Administrador decide na aprovação.
function validarSolicitacao(corpo) {
  const erros = {};
  const dados = validarIdentificacao(corpo, erros);
  validarNovaSenha(corpo.senha, corpo.confirmacao, erros);
  return { erros, dados: { ...dados, senha: corpo.senha } };
}

// id do colaborador vinculado: opcional
function lerColaborador(valor, erros) {
  if (valor === undefined || valor === null || valor === '') return null;
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    erros.id_colaborador = 'Colaborador inválido.';
    return null;
  }
  return id;
}

function lerPerfil(valor, erros) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) {
    erros.id_perfil = 'Selecione o perfil.';
    return null;
  }
  return id;
}

// Dados editáveis pelo Administrador (perfil e situação têm ações próprias)
function validarDadosConta(corpo) {
  const erros = {};
  const dados = validarIdentificacao(corpo, erros);
  dados.id_colaborador = lerColaborador(corpo.id_colaborador, erros);
  return { erros, dados };
}

// Criação pelo Administrador: dados + perfil + motivo (exigido ao conceder
// o perfil Administrador, RN27). A senha é provisória, gerada pelo sistema.
function validarCriacao(corpo) {
  const { erros, dados } = validarDadosConta(corpo);
  dados.id_perfil = lerPerfil(corpo.id_perfil, erros);
  dados.motivo = textoOuNulo(corpo.motivo);
  return { erros, dados };
}

// Aprovação do autocadastro: perfil e colaborador definidos pelo Administrador
function validarAprovacao(corpo) {
  const erros = {};
  const dados = {
    id_perfil: lerPerfil(corpo.id_perfil, erros),
    id_colaborador: lerColaborador(corpo.id_colaborador, erros),
    motivo: textoOuNulo(corpo.motivo)
  };
  return { erros, dados };
}

// Alteração de perfil (RN27): motivo obrigatório e data efetiva opcional,
// não futura (padrão: hoje)
function validarAlteracaoPerfil(corpo) {
  const erros = {};
  const dados = {
    id_perfil: lerPerfil(corpo.id_perfil, erros),
    motivo: textoOuNulo(corpo.motivo),
    data_efetiva: textoOuNulo(corpo.data_efetiva) || hoje()
  };
  if (!dados.motivo) erros.motivo = 'Informe o motivo da alteração de perfil.';
  else if (dados.motivo.length > 255) erros.motivo = 'O motivo deve ter no máximo 255 caracteres.';
  if (!dataValida(dados.data_efetiva)) erros.data_efetiva = 'Informe uma data válida.';
  else if (dados.data_efetiva > hoje()) erros.data_efetiva = 'A data efetiva não pode ser futura.';
  return { erros, dados };
}

function validarSituacao(corpo) {
  const erros = {};
  const situacao = corpo.situacao;
  if (!['ativo', 'inativo'].includes(situacao)) erros.situacao = 'Situação inválida.';
  const motivo = textoOuNulo(corpo.motivo);
  if (motivo && motivo.length > 255) erros.motivo = 'O motivo deve ter no máximo 255 caracteres.';
  return { erros, dados: { situacao, motivo } };
}

// Minha conta: cada pessoa atualiza nome e e-mail (login e perfil, não)
function validarDadosProprios(corpo) {
  const erros = {};
  const { nome, email } = validarIdentificacao({ ...corpo, login: 'login.valido' }, erros);
  return { erros, dados: { nome, email } };
}

module.exports = {
  normalizarLogin, normalizarEmail, validarSolicitacao, validarNovaSenha,
  validarDadosConta, validarCriacao, validarAprovacao, validarAlteracaoPerfil,
  validarSituacao, validarDadosProprios
};
