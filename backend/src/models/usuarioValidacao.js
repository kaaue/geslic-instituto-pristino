// Validações das contas de acesso (RF_B8): autocadastro, criação e edição
// pelo Administrador, troca e redefinição de senha.
// Formato igual às demais validações: devolvem { dados, erros }, com erros no
// formato campo -> mensagem. As mesmas regras estão na interface.

const { normalizarTexto, textoOuNulo, dataValida, hoje } = require('../utils/normalizacao');
const { problemaNaSenha } = require('../utils/senha');

// Login: minúsculas, números, ponto, hífen e sublinhado; começa com letra ou número
const FORMATO_LOGIN = /^[a-z0-9][a-z0-9._-]{2,39}$/;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// As contas usam o correio eletrônico institucional (RN41, CA23)
const DOMINIO_INSTITUCIONAL = '@pristino.org.br';

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
  else if (!email.endsWith(DOMINIO_INSTITUCIONAL)) erros.email = `Use o e-mail institucional (${DOMINIO_INSTITUCIONAL}).`;

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
// O setor e o cargo identificam o colaborador, que só é criado na aprovação.
function validarSolicitacao(corpo) {
  const erros = {};
  const dados = validarIdentificacao(corpo, erros);
  validarNovaSenha(corpo.senha, corpo.confirmacao, erros);
  const idSetor = Number(corpo.id_setor);
  if (!Number.isInteger(idSetor) || idSetor <= 0) erros.id_setor = 'Selecione o seu setor.';
  const cargo = textoOuNulo(corpo.cargo);
  if (cargo && cargo.length > 80) erros.cargo = 'O cargo deve ter no máximo 80 caracteres.';
  return { erros, dados: { ...dados, senha: corpo.senha, id_setor: idSetor, cargo } };
}

// Colaborador novo, cadastrado junto com a conta (criação ou aprovação).
// O nome padrão é o da conta. Devolve null quando não foi enviado.
function lerColaboradorNovo(corpo, nomeConta, erros) {
  const novo = corpo.colaborador_novo;
  if (!novo || typeof novo !== 'object') return null;
  // na aprovação (nomeConta null), sem nome informado vale o nome da conta solicitada
  const nome = normalizarTexto(novo.nome) || nomeConta || null;
  const cargo = textoOuNulo(novo.cargo);
  const idSetor = Number(novo.id_setor);
  if (nome !== null || nomeConta !== null) {
    if (!nome || nome.length < 3) erros.colaborador_nome = 'Informe o nome do colaborador.';
    else if (nome.length > 120) erros.colaborador_nome = 'O nome deve ter no máximo 120 caracteres.';
  }
  if (!Number.isInteger(idSetor) || idSetor <= 0) erros.colaborador_id_setor = 'Selecione o setor do colaborador.';
  if (cargo && cargo.length > 80) erros.colaborador_cargo = 'O cargo deve ter no máximo 80 caracteres.';
  return { nome, cargo, id_setor: idSetor };
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
  dados.colaborador_novo = dados.id_colaborador ? null : lerColaboradorNovo(corpo, dados.nome, erros);
  dados.confirmar_homonimo = corpo.confirmar_homonimo === true;
  return { erros, dados };
}

// Aprovação do autocadastro: perfil e colaborador definidos pelo Administrador
function validarAprovacao(corpo) {
  const erros = {};
  const dados = {
    id_perfil: lerPerfil(corpo.id_perfil, erros),
    id_colaborador: lerColaborador(corpo.id_colaborador, erros),
    motivo: textoOuNulo(corpo.motivo),
    confirmar_homonimo: corpo.confirmar_homonimo === true
  };
  dados.colaborador_novo = dados.id_colaborador ? null : lerColaboradorNovo(corpo, null, erros);
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

// Minha conta: cada pessoa atualiza nome e e-mail (login e perfil, não) e,
// no mesmo bloco, pode trocar a senha (Protótipo 4): com nova senha, a atual
// e a confirmação passam a ser exigidas
function validarDadosProprios(corpo) {
  const erros = {};
  const { nome, email } = validarIdentificacao({ ...corpo, login: 'login.valido' }, erros);
  const dados = { nome, email };
  if (corpo.senha || corpo.senha_atual || corpo.confirmacao) {
    if (!corpo.senha_atual) erros.senha_atual = 'Informe a senha atual.';
    validarNovaSenha(corpo.senha, corpo.confirmacao, erros);
    dados.senha_atual = corpo.senha_atual;
    dados.senha = corpo.senha;
  }
  return { erros, dados };
}

// Transferência de privilégios de administrador (Protótipo 13.1, RN27):
// concede o perfil a uma conta e revoga de outra numa única operação
function validarTransferencia(corpo) {
  const erros = {};
  const idConcedida = Number(corpo.id_concedida);
  const idRevogada = Number(corpo.id_revogada);
  if (!Number.isInteger(idConcedida) || idConcedida <= 0) erros.id_concedida = 'Selecione a conta da nova gestora.';
  if (!Number.isInteger(idRevogada) || idRevogada <= 0) erros.id_revogada = 'Selecione a conta da gestora que sai.';
  else if (idRevogada === idConcedida) erros.id_revogada = 'Escolha contas diferentes para conceder e revogar.';
  const destino = corpo.destino_revogada;
  if (!['operador', 'inativar'].includes(destino)) erros.destino_revogada = 'Escolha rebaixar a Operador ou inativar a conta.';
  const motivo = textoOuNulo(corpo.motivo);
  if (!motivo) erros.motivo = 'Informe o motivo.';
  else if (motivo.length > 255) erros.motivo = 'O motivo deve ter no máximo 255 caracteres.';
  const dataEfetiva = textoOuNulo(corpo.data_efetiva);
  if (!dataValida(dataEfetiva)) erros.data_efetiva = 'Informe uma data válida.';
  return {
    erros,
    dados: { id_concedida: idConcedida, id_revogada: idRevogada, destino_revogada: destino, motivo, data_efetiva: dataEfetiva }
  };
}

module.exports = {
  normalizarLogin, normalizarEmail, validarSolicitacao, validarNovaSenha,
  validarDadosConta, validarCriacao, validarAprovacao, validarAlteracaoPerfil,
  validarSituacao, validarDadosProprios, validarTransferencia, DOMINIO_INSTITUCIONAL
};
