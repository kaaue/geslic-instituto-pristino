// Controller da RF_S8 Consultar a central de notificações - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/notificacaoModel'));
