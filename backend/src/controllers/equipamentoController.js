// Controller da RF_B3 - Gerenciar equipamentos.
// Lê a requisição, valida a entrada, chama o model e devolve a resposta.
// As regras dos dados (etiquetas únicas, RN08, RN22) ficam no model; quem
// pode cada operação (RN21) é decidido nas rotas.

const Equipamento = require('../models/equipamentoModel');
const { validarEquipamento } = require('../models/equipamentoValidacao');
const { lancarSeHouverErros } = require('../utils/AppError');

const responsavel = (req) => req.usuario.id_usuario;

async function listar(req, res) {
  res.json(await Equipamento.listar(req.query));
}

async function buscar(req, res) {
  res.json(await Equipamento.buscarPorId(Number(req.params.id)));
}

async function incluir(req, res) {
  const { erros, dados } = validarEquipamento(req.body);
  lancarSeHouverErros(erros);
  res.status(201).json(await Equipamento.incluir(dados, responsavel(req)));
}

async function alterar(req, res) {
  const { erros, dados } = validarEquipamento(req.body);
  lancarSeHouverErros(erros);
  res.json(await Equipamento.alterar(Number(req.params.id), dados, responsavel(req)));
}

async function inativar(req, res) {
  res.json(await Equipamento.inativar(Number(req.params.id), responsavel(req)));
}

async function excluir(req, res) {
  res.json(await Equipamento.excluir(Number(req.params.id), responsavel(req)));
}

async function previaInativacao(req, res) {
  res.json(await Equipamento.previaInativacao(Number(req.params.id)));
}

module.exports = { listar, buscar, incluir, alterar, inativar, excluir, previaInativacao };
