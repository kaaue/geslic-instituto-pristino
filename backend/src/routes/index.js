// Reúne as rotas da API sob /api.
// Cada função básica tem seu arquivo de rotas: RF_B3 (equipamentos) e
// RF_B6 (projetos) até aqui; setores e colaboradores alimentam as listas de seleção.

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const saude = require('../controllers/saudeController');
const setores = require('../controllers/setorController');
const colaboradores = require('../controllers/colaboradorController');

const rotas = express.Router();

rotas.get('/saude', asyncHandler(saude.verificar));
rotas.get('/setores', asyncHandler(setores.listar));
rotas.get('/colaboradores', asyncHandler(colaboradores.listar));
rotas.use('/equipamentos', require('./equipamentoRoutes'));
rotas.use('/projetos', require('./projetoRoutes'));

module.exports = rotas;
