// Controller de colaboradores (RF_B4). A listagem dos ativos alimenta as
// listas de seleção; as demais operações estão em desenvolvimento (501).

const Colaborador = require('../models/colaboradorModel');
const { controllerPendente } = require('../utils/pendente');

async function listar(req, res) {
  res.json(await Colaborador.listarAtivos());
}

const { buscar, incluir, alterar, desligar, excluir } = controllerPendente(Colaborador);

module.exports = { listar, buscar, incluir, alterar, desligar, excluir };
