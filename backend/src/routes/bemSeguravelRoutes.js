// Rotas da RF_B6 - Gerenciar bens seguráveis.
// Permissões (RN21): consultar, incluir e inativar (com data efetiva, RN37) -
// Operador e Administrador; corrigir, reativar e excluir (sem apólices,
// RN22) - somente o Administrador.

const express = require('express');
const controller = require('../controllers/bemSeguravelController');
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

module.exports = rotas;
