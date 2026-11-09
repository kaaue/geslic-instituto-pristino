// Controller da RF_F8 a RF_F11 Apólices de seguro - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/apoliceModel'));
