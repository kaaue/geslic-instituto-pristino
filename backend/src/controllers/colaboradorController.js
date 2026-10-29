// Controller de colaboradores: alimenta as listas de seleção das telas.

const Colaborador = require('../models/colaboradorModel');

async function listar(req, res) {
  res.json(await Colaborador.listarAtivos());
}

module.exports = { listar };
