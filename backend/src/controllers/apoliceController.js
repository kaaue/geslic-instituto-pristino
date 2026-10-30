// Controller da RF_F7 a RF_F10 Apólices de seguro - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/apoliceModel'));
