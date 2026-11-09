// Controller da RF_B4 - Gerenciar colaboradores.

const Colaborador = require('../models/colaboradorModel');
const { validarColaborador } = require('../models/colaboradorValidacao');
const { controllerDeCadastro, validarEvento, idDaRota, contaDaSessao } = require('../utils/controllerCadastro');
const { normalizarTexto } = require('../utils/normalizacao');

const { listar, buscar, incluir, alterar, reativar, excluir } = controllerDeCadastro(Colaborador, validarColaborador);

module.exports = {
  listar, buscar, incluir, alterar, reativar, excluir,

  // Lista dos ativos, para as listas de seleção das outras telas
  async listarAtivos(req, res) {
    res.json(await Colaborador.listarAtivos());
  },

  async homonimos(req, res) {
    res.json(await Colaborador.homonimos(normalizarTexto(req.query.nome), Number(req.query.exceto) || null));
  },

  async previaDesligamento(req, res) {
    res.json(await Colaborador.previaDesligamento(idDaRota(req)));
  },

  async desligar(req, res) {
    res.json(await Colaborador.desligar(idDaRota(req), validarEvento(req.body), contaDaSessao(req)));
  }
};
