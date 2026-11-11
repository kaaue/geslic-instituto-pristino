// Controller da RF_B6 - Gerenciar bens seguráveis.

const { controllerDeCadastro } = require('../utils/controllerCadastro');
const { validarBem } = require('../models/bemValidacao');

module.exports = controllerDeCadastro(require('../models/bemSeguravelModel'), validarBem);
