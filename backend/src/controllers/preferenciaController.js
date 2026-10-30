// Controller da RF_B10 Configurar preferências de notificação - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/preferenciaModel'));
