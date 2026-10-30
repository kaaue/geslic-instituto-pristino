// Central de notificações (RF_S8, em desenvolvimento: 501): avisos da própria
// conta, para qualquer conta autenticada.

const express = require('express');
const controller = require('../controllers/notificacaoController');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', asyncHandler(controller.listar));
rotas.get('/nao-lidas', asyncHandler(controller.contarNaoLidas));
rotas.post('/leitura', asyncHandler(controller.marcarLidas));

module.exports = rotas;
