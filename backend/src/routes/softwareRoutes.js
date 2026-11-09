// RF_B2 Gerenciar softwares (em desenvolvimento: 501).
// Permissões (RN21): consultar, incluir e inativar - Operador e Administrador;
// alterar e excluir - somente o Administrador.

const express = require('express');
const controller = require('../controllers/softwareController');
const { exigirPermissao: p } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', p('cadastro.consultar'), asyncHandler(controller.listar));
rotas.get('/:id', p('cadastro.consultar'), asyncHandler(controller.buscar));
rotas.post('/', p('cadastro.incluir'), asyncHandler(controller.incluir));
rotas.put('/:id', p('cadastro.alterar'), asyncHandler(controller.alterar));
rotas.post('/:id/inativacao', p('cadastro.inativar'), asyncHandler(controller.inativar));
rotas.delete('/:id', p('cadastro.excluir'), asyncHandler(controller.excluir));
module.exports = rotas;
