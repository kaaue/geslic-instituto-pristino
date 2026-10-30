// Controller da RF_F11 Anexar e consultar documentos PDF - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/documentoModel'));
