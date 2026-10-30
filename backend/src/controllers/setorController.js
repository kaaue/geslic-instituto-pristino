// Controller de setores (RF_B5). A listagem dos ativos alimenta as listas de
// seleção; as demais operações estão em desenvolvimento (501).

const Setor = require('../models/setorModel');
const { controllerPendente } = require('../utils/pendente');

async function listar(req, res) {
  res.json(await Setor.listarAtivos());
}

const { buscar, incluir, alterar, inativar, excluir } = controllerPendente(Setor);

module.exports = { listar, buscar, incluir, alterar, inativar, excluir };
