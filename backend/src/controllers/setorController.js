// Controller da RF_B5 - Gerenciar setores.

const Setor = require('../models/setorModel');
const { validarSetor } = require('../models/setorValidacao');
const { controllerDeCadastro } = require('../utils/controllerCadastro');

module.exports = {
  ...controllerDeCadastro(Setor, validarSetor),
  // Lista dos ativos, para as listas de seleção das outras telas
  async listarAtivos(req, res) {
    res.json(await Setor.listarAtivos());
  }
};
