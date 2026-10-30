// Autenticação e autorização (RF_B9, RN21, seção 2.3.2 da ERS).
//
// autenticar: exige a sessão do cookie, confere no banco a cada requisição e
//   carrega a conta com perfil e permissões atuais em req.usuario. Conta
//   desativada, sessão encerrada ou vencida: 401. Assim, desativar a conta,
//   trocar o perfil ou mudar as permissões vale já na requisição seguinte.
// exigirPermissao: depois de autenticar; sem a permissão, 403.
//
// Nada que o cliente envia (cabeçalho, corpo, cookie que não seja o token)
// define perfil ou privilégio.

const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { tokenDaSessao, apagarCookieSessao } = require('../utils/cookies');
const Sessao = require('../models/sessaoModel');
const Usuario = require('../models/usuarioModel');

// Com senha provisória, a conta só pode consultar quem é, sair e trocar a senha
const PERMITIDO_NA_TROCA_DE_SENHA = ['GET /api/auth/me', 'POST /api/auth/logout', 'PUT /api/conta/senha'];

const autenticar = asyncHandler(async (req, res, proximo) => {
  const token = tokenDaSessao(req);
  if (!token) throw AppError.naoAutenticado();

  const sessao = await Sessao.validar(token);
  const usuario = sessao && await Usuario.carregarAutenticado(sessao.idUsuario);
  if (!usuario) {
    if (sessao) await Sessao.encerrar(sessao.idSessao, 'conta_indisponivel');
    apagarCookieSessao(res);
    throw AppError.naoAutenticado('Sua sessão expirou ou foi encerrada. Entre novamente.', 'SESSAO_EXPIRADA');
  }

  req.sessao = sessao;
  req.usuario = usuario;

  const rota = `${req.method} ${req.originalUrl.split('?')[0]}`.replace(/\/$/, '');
  if (usuario.troca_senha_obrigatoria && !PERMITIDO_NA_TROCA_DE_SENHA.includes(rota)) {
    throw AppError.proibido('Troque a senha provisória antes de continuar.', 'TROCA_SENHA_OBRIGATORIA');
  }
  proximo();
});

function pode(usuario, codigo) {
  return Boolean(usuario && usuario.permissoes.includes(codigo));
}

// Exige todas as permissões indicadas
function exigirPermissao(...codigos) {
  return (req, res, proximo) => {
    if (!req.usuario) return proximo(AppError.naoAutenticado());
    const faltando = codigos.filter((c) => !pode(req.usuario, c));
    if (faltando.length) {
      return proximo(AppError.proibido(
        `Seu perfil (${req.usuario.perfil}) não tem permissão para esta operação.`));
    }
    proximo();
  };
}

// Dados sensíveis (ex.: chave de ativação) só para perfis com
// visualiza_dados_sensiveis (seção 2.3.2: "reveladas somente a perfis com permissão")
function exigirDadosSensiveis(req, res, proximo) {
  if (!req.usuario) return proximo(AppError.naoAutenticado());
  if (!req.usuario.visualiza_dados_sensiveis) {
    return proximo(AppError.proibido(`Seu perfil (${req.usuario.perfil}) não visualiza dados sensíveis.`));
  }
  proximo();
}

module.exports = { autenticar, exigirPermissao, exigirDadosSensiveis, pode };
