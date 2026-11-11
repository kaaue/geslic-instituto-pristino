// Controller da RF_B1 - Gerenciar fornecedores e seguradoras.

const { controllerDeCadastro } = require('../utils/controllerCadastro');
const { validarFornecedor } = require('../models/fornecedorValidacao');

module.exports = controllerDeCadastro(require('../models/fornecedorModel'), validarFornecedor);
