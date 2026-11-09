// Controller da RF_F2 a RF_F7 Licenças de software - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/licencaModel'));
