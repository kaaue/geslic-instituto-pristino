// Minha conta (RF_B8) e preferências de notificação (RF_B9): qualquer conta
// autenticada, sempre sobre a própria conta. PUT / salva os dados e, se
// vierem, a troca de senha, num único bloco; PUT /senha é a troca só da
// senha (usada na troca obrigatória da senha provisória).

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
