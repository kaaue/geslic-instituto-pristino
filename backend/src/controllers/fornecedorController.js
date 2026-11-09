// Controller da RF_B1 Gerenciar fornecedores e seguradoras - EM DESENVOLVIMENTO: repassa ao model, que responde 501.

const { controllerPendente } = require('../utils/pendente');

module.exports = controllerPendente(require('../models/fornecedorModel'));
