// Perfis de acesso (RN21): o Administrador faz tudo o que o Operador faz e,
// além disso, altera e exclui dados cadastrais e gerencia as contas.
//
// A autenticação com conta individual entra com a RF_B9 (Gerenciar contas e
// perfis). Até lá, a interface envia o perfil escolhido no cabeçalho X-Perfil,
// e a API aplica a regra a partir dele. Assim a regra já fica no servidor, que
// é onde ela precisa estar, e só a origem do perfil muda quando houver login.

const AppError = require('../utils/AppError');

const PERFIS = ['administrador', 'operador'];

function perfilDaRequisicao(req) {
  const perfil = String(req.get('X-Perfil') || '').toLowerCase();
  return PERFIS.includes(perfil) ? perfil : 'operador';
}

// Para as rotas exclusivas do Administrador
function exigirAdministrador(req, res, proximo) {
  if (perfilDaRequisicao(req) !== 'administrador') {
    return proximo(AppError.proibido(
      'Somente o perfil Administrador pode alterar ou excluir dados cadastrais.'));
  }
  proximo();
}

module.exports = { exigirAdministrador, perfilDaRequisicao };
