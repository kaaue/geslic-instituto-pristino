// Documentos PDF de licenças e apólices: RF_F11 (em desenvolvimento: 501).
// Acessíveis só por contas autenticadas com documento.gerenciar (seção 2.3.2).

const express = require('express');
const controller = require('../controllers/documentoController');
const { exigirPermissao } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();
rotas.use(exigirPermissao('documento.gerenciar'));

rotas.get('/', asyncHandler(controller.listar));
rotas.get('/:id/arquivo', asyncHandler(controller.baixar));
rotas.post('/', asyncHandler(controller.anexar));

module.exports = rotas;
