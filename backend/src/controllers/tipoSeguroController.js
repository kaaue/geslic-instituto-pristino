// Controller da RF_B8 Gerenciar tipos de seguro e coberturas - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/tipoSeguroModel'));
