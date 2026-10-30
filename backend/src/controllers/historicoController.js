// Histórico de movimentações e auditoria (RF_S7, RF_F13): consulta exclusiva
// de quem tem auditoria.consultar (o Administrador), com filtros e paginação.

const Historico = require('../models/historicoModel');
const { semSegredos } = require('../models/historicoModel');

const POR_PAGINA_PADRAO = 25;
const POR_PAGINA_MAXIMO = 100;

// Os dados de antes e depois já são gravados sem segredos; o filtro aqui
// protege também eventos que venham de importações ou versões futuras.
function prepararItem(item) {
  return {
    ...item,
    dados_anteriores: semSegredos(item.dados_anteriores),
    dados_posteriores: semSegredos(item.dados_posteriores)
  };
}

async function listar(req, res) {
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  const porPagina = Math.min(POR_PAGINA_MAXIMO,
    Math.max(1, Number.parseInt(req.query.por_pagina, 10) || POR_PAGINA_PADRAO));
  const resultado = await Historico.listar(req.query, { pagina, porPagina });
  res.json({ ...resultado, itens: resultado.itens.map(prepararItem) });
}

async function opcoes(req, res) {
  res.json(await Historico.opcoesDeFiltro());
}

module.exports = { listar, opcoes };
