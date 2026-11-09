// Minha conta (RF_B9) e preferências de notificação (RF_B10): qualquer conta
// autenticada, sempre sobre a própria conta.

const express = require('express');
const conta = require('../controllers/contaController');
const preferencias = require('../controllers/preferenciaController');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.put('/', asyncHandler(conta.atualizarDados));
rotas.put('/senha', asyncHandler(conta.alterarSenha));
rotas.get('/preferencias', asyncHandler(preferencias.consultar));
rotas.put('/preferencias', asyncHandler(preferencias.salvar));

module.exports = rotas;
