// Controller da RF_B2 - Gerenciar softwares.

const Software = require('../models/softwareModel');
const { controllerDeCadastro } = require('../utils/controllerCadastro');
const { validarSoftware } = require('../models/softwareValidacao');

module.exports = {
  ...controllerDeCadastro(Software, validarSoftware),
  async listarCategorias(req, res) {
    res.json(await Software.listarCategorias());
  }
};
