// Defesa extra contra CSRF, além do cookie SameSite=Strict: requisições que
// alteram dados e informam a origem só são aceitas se vierem da própria
// interface (FRONTEND_URL) ou do próprio servidor da API.

const AppError = require('../utils/AppError');
const { frontendUrl } = require('../config/env');

const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];

module.exports = function conferirOrigem(req, res, proximo) {
  const origem = req.get('Origin');
  if (METODOS_SEGUROS.includes(req.method) || !origem) return proximo();
  const propria = `${req.protocol}://${req.get('Host')}`;
  if (origem === frontendUrl || origem === propria) return proximo();
  proximo(AppError.proibido('Origem da requisição não permitida.', 'ORIGEM_NAO_PERMITIDA'));
};
