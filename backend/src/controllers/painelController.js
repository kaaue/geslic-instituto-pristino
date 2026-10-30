// Controller da RF_S1 Consultar painel de acompanhamento - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/painelModel'));
