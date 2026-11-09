// Controller da RF_S2 a RF_S6 Relatórios - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/relatorioModel'));
