// Rotas da RF_B2 - Gerenciar softwares.
// Permissões (RN21): consultar, incluir e inativar (com data efetiva, RN37) -
// Operador e Administrador; corrigir, reativar e excluir (sem licenças,
// RN22) - somente o Administrador.

const express = require('express');
const controller = require('../controllers/softwareController');
const { exigirPermissao: p } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', p('cadastro.consultar'), asyncHandler(controller.listar));
// antes de /:id, senão "categorias" seria lido como id
rotas.get('/categorias', p('cadastro.consultar'), asyncHandler(controller.listarCategorias));
rotas.get('/:id', p('cadastro.consultar'), asyncHandler(controller.buscar));
rotas.post('/', p('cadastro.incluir'), asyncHandler(controller.incluir));
rotas.put('/:id', p('cadastro.alterar'), asyncHandler(controller.alterar));
rotas.post('/:id/inativacao', p('cadastro.inativar'), asyncHandler(controller.inativar));
rotas.post('/:id/reativacao', p('cadastro.alterar'), asyncHandler(controller.reativar));

module.exports = rotas;
