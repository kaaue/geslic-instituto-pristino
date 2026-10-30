// Controller da RF_B7 Gerenciar bens seguráveis - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/bemSeguravelModel'));
