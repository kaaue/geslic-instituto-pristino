// Controller de Contas e perfis (RF_B9, RN21, RN27): exclusivo de quem tem
// a permissão usuario.gerenciar (o Administrador). As regras ficam no model.

const Usuario = require('../models/usuarioModel');
const { lancarSeHouverErros } = require('../utils/AppError');
const { textoOuNulo } = require('../utils/normalizacao');
const {
  validarDadosConta, validarCriacao, validarAprovacao, validarAlteracaoPerfil, validarSituacao
} = require('../models/usuarioValidacao');

const id = (req) => Number(req.params.id);
const responsavel = (req) => req.usuario.id_usuario;

async function listar(req, res) {
  res.json(await Usuario.listar(req.query));
}

async function buscar(req, res) {
  res.json(await Usuario.buscarPorId(id(req)));
}

async function criar(req, res) {
  const { erros, dados } = validarCriacao(req.body || {});
  lancarSeHouverErros(erros);
  res.status(201).json(await Usuario.criar(dados, responsavel(req)));
}

async function atualizar(req, res) {
  const { erros, dados } = validarDadosConta(req.body || {});
  lancarSeHouverErros(erros);
  res.json(await Usuario.atualizar(id(req), dados, responsavel(req)));
}

async function aprovar(req, res) {
  const { erros, dados } = validarAprovacao(req.body || {});
  lancarSeHouverErros(erros);
  res.json(await Usuario.aprovar(id(req), dados, responsavel(req)));
}

async function rejeitar(req, res) {
  res.json(await Usuario.rejeitar(id(req), textoOuNulo(req.body?.motivo), responsavel(req)));
}

async function alterarPerfil(req, res) {
  const { erros, dados } = validarAlteracaoPerfil(req.body || {});
  lancarSeHouverErros(erros);
  res.json(await Usuario.alterarPerfil(id(req), dados, responsavel(req)));
}

async function alterarSituacao(req, res) {
  const { erros, dados } = validarSituacao(req.body || {});
  lancarSeHouverErros(erros);
  res.json(await Usuario.alterarSituacao(id(req), dados, responsavel(req)));
}

async function definirSenhaProvisoria(req, res) {
  res.json(await Usuario.definirSenhaProvisoria(id(req), responsavel(req)));
}

async function listarPerfis(req, res) {
  res.json(await Usuario.listarPerfis());
}

async function definirPermissoes(req, res) {
  const permissoes = Array.isArray(req.body?.permissoes) ? req.body.permissoes.map(String) : null;
  if (!permissoes) lancarSeHouverErros({ permissoes: 'Informe a lista de permissões.' });
  res.json({ permissoes: await Usuario.definirPermissoes(id(req), [...new Set(permissoes)], responsavel(req)) });
}

module.exports = {
  listar, buscar, criar, atualizar, aprovar, rejeitar, alterarPerfil,
  alterarSituacao, definirSenhaProvisoria, listarPerfis, definirPermissoes
};
