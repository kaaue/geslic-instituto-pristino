// Rotas da RF_B7 - Gerenciar tipos de seguro e coberturas.
// Permissões (RN21): consultar, incluir e inativar - Operador e
// Administrador; corrigir, reativar e excluir (sem uso em apólices, RN22) -
// somente o Administrador. As mesmas regras valem para as coberturas.

const express = require('express');
const controller = require('../controllers/tipoSeguroController');
const { exigirPermissao: p } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', p('cadastro.consultar'), asyncHandler(controller.listar));
rotas.get('/:id', p('cadastro.consultar'), asyncHandler(controller.buscar));
rotas.post('/', p('cadastro.incluir'), asyncHandler(controller.incluir));
rotas.put('/:id', p('cadastro.alterar'), asyncHandler(controller.alterar));
rotas.post('/:id/inativacao', p('cadastro.inativar'), asyncHandler(controller.inativar));
rotas.post('/:id/reativacao', p('cadastro.alterar'), asyncHandler(controller.reativar));
rotas.delete('/:id', p('cadastro.excluir'), asyncHandler(controller.excluir));

// Coberturas de cada tipo de seguro
rotas.get('/:id/coberturas', p('cadastro.consultar'), asyncHandler(controller.listarCoberturas));
rotas.post('/:id/coberturas', p('cadastro.incluir'), asyncHandler(controller.incluirCobertura));
rotas.put('/coberturas/:idCobertura', p('cadastro.alterar'), asyncHandler(controller.alterarCobertura));
rotas.post('/coberturas/:idCobertura/inativacao', p('cadastro.inativar'), asyncHandler(controller.inativarCobertura));
rotas.post('/coberturas/:idCobertura/reativacao', p('cadastro.alterar'), asyncHandler(controller.reativarCobertura));
rotas.delete('/coberturas/:idCobertura', p('cadastro.excluir'), asyncHandler(controller.excluirCobertura));

module.exports = rotas;
