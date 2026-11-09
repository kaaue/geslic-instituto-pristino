// Controller da RF_B3 - Gerenciar equipamentos.
// Lê a requisição, valida a entrada, chama o model e devolve a resposta.
// As regras dos dados (etiquetas únicas, RN08, RN22, RN37) ficam no model;
// quem pode cada operação (RN21) é decidido nas rotas. A inativação
// (descarte) exige data efetiva e motivo.

const Equipamento = require('../models/equipamentoModel');
const { validarEquipamento } = require('../models/equipamentoValidacao');
const { controllerDeCadastro, idDaRota } = require('../utils/controllerCadastro');

module.exports = {
  ...controllerDeCadastro(Equipamento, validarEquipamento, { motivoObrigatorio: true }),
  async previaInativacao(req, res) {
    res.json(await Equipamento.previaInativacao(idDaRota(req)));
  }
};
