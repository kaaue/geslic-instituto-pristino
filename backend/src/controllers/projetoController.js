// Controller da RF_B6 - Gerenciar projetos institucionais.
// Lê a requisição, valida a entrada, chama o model e devolve a resposta.
// As regras dos dados (RN17, RN18, RN19, RN22) ficam no model; quem pode cada
// operação (RN21) é decidido nas rotas.

const Projeto = require('../models/projetoModel');
const { validarProjeto } = require('../models/projetoValidacao');
const { lancarSeHouverErros } = require('../utils/AppError');

async function listar(req, res) {
  res.json(await Projeto.listar(req.query));
}

async function listarFontes(req, res) {
  res.json(await Projeto.listarFontes());
}

async function buscar(req, res) {
  res.json(await Projeto.buscarComParticipantes(Number(req.params.id)));
}

async function incluir(req, res) {
  const { erros, dados } = validarProjeto(req.body);
  lancarSeHouverErros(erros);
  res.status(201).json(await Projeto.incluir(dados));
}

async function alterar(req, res) {
  const { erros, dados } = validarProjeto(req.body);
  lancarSeHouverErros(erros);
  res.json(await Projeto.alterar(Number(req.params.id), dados));
}

async function prorrogar(req, res) {
  res.json(await Projeto.prorrogar(Number(req.params.id), req.body));
}

async function encerrar(req, res) {
  res.json(await Projeto.encerrar(Number(req.params.id), req.body));
}

async function excluir(req, res) {
  res.json(await Projeto.excluir(Number(req.params.id)));
}

module.exports = { listar, listarFontes, buscar, incluir, alterar, prorrogar, encerrar, excluir };
