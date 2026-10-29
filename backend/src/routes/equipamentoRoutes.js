// Rotas da RF_B3 - Gerenciar equipamentos.

const express = require('express');
const controller = require('../controllers/equipamentoController');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', asyncHandler(controller.listar));
rotas.get('/:id', asyncHandler(controller.buscar));
rotas.post('/', asyncHandler(controller.incluir));
rotas.put('/:id', asyncHandler(controller.alterar));
rotas.delete('/:id', asyncHandler(controller.excluir));
// Prévia da inativação, para a interface avisar antes de confirmar (RN08)
rotas.get('/:id/previa-inativacao', asyncHandler(controller.previaInativacao));

module.exports = rotas;
