// Histórico de movimentações e auditoria (RF_S7, RF_F13): exclusivo de quem
// tem auditoria.consultar (o Administrador).

const express = require('express');
const controller = require('../controllers/historicoController');
const { exigirPermissao } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();
rotas.use(exigirPermissao('auditoria.consultar'));

rotas.get('/', asyncHandler(controller.listar));
rotas.get('/opcoes', asyncHandler(controller.opcoes));

module.exports = rotas;
