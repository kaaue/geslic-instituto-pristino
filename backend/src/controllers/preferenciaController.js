// Controller da RF_B9 - Configurar preferências de notificação: sempre da
// própria conta (a da sessão).

const Preferencia = require('../models/preferenciaModel');

async function consultar(req, res) {
  res.json(await Preferencia.consultar(req.usuario));
}

async function salvar(req, res) {
  res.json(await Preferencia.salvar(req.usuario, req.body || {}));
}

module.exports = { consultar, salvar };
