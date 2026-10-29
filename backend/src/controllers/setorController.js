// Controller de setores: alimenta as listas de seleção das telas.

const Setor = require('../models/setorModel');

async function listar(req, res) {
  res.json(await Setor.listarAtivos());
}

module.exports = { listar };
