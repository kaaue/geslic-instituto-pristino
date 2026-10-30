// Painel (RF_S1) e relatórios RF_S2 a RF_S6 (em desenvolvimento: 501).
// O histórico (RF_S7) tem rota própria, exclusiva do Administrador.

const express = require('express');
const painel = require('../controllers/painelController');
const relatorios = require('../controllers/relatorioController');
const { exigirPermissao } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();
const p = exigirPermissao('relatorio.consultar');

rotas.get('/painel', p, asyncHandler(painel.consultar));
rotas.get('/relatorios/licencas', p, asyncHandler(relatorios.licencas));
rotas.get('/relatorios/mapa-licencas', p, asyncHandler(relatorios.mapaLicencas));
rotas.get('/relatorios/apolices', p, asyncHandler(relatorios.apolices));
rotas.get('/relatorios/bens-segurados', p, asyncHandler(relatorios.bensSegurados));
rotas.get('/relatorios/financeiro', p, asyncHandler(relatorios.financeiro));

module.exports = rotas;
