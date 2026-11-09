// Apólices de seguro: RF_F7 a RF_F10 e a consulta da RF_S4 (em desenvolvimento: 501).
// Permissões (RN21): registrar, vincular itens, renovar e cancelar - Operador
// e Administrador; corrigir e excluir - somente o Administrador.

const express = require('express');
const controller = require('../controllers/apoliceController');
const { exigirPermissao: p } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', p('apolice.consultar'), asyncHandler(controller.listar));
rotas.get('/:id', p('apolice.consultar'), asyncHandler(controller.buscar));
rotas.post('/', p('apolice.registrar'), asyncHandler(controller.registrar));
rotas.put('/:id', p('cadastro.alterar'), asyncHandler(controller.alterar));
rotas.delete('/:id', p('cadastro.excluir'), asyncHandler(controller.excluir));
rotas.post('/:id/itens', p('apolice.registrar'), asyncHandler(controller.vincularItens));
rotas.post('/:id/renovacao', p('apolice.renovar'), asyncHandler(controller.renovar));
rotas.post('/:id/cancelamento', p('apolice.cancelar'), asyncHandler(controller.cancelar));

module.exports = rotas;
