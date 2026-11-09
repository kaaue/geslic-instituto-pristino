// Rotas da RF_B4 - Gerenciar colaboradores.
// Permissões (RN21): consultar e incluir - Operador e Administrador;
// corrigir, desligar (com data efetiva, RN07 e RN37), reativar e excluir
// (sem vínculos, RN22) - somente o Administrador. O Operador pede a
// correção por solicitação de ajuste (RF_B10).

const express = require('express');
const controller = require('../controllers/colaboradorController');
const { exigirPermissao: p } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', p('cadastro.consultar'), asyncHandler(controller.listar));
// antes de /:id: lista dos ativos (seleções) e conferência de homônimos
rotas.get('/ativos', p('cadastro.consultar'), asyncHandler(controller.listarAtivos));
rotas.get('/homonimos', p('cadastro.consultar'), asyncHandler(controller.homonimos));
rotas.get('/:id', p('cadastro.consultar'), asyncHandler(controller.buscar));
rotas.get('/:id/previa-desligamento', p('cadastro.consultar'), asyncHandler(controller.previaDesligamento));
rotas.post('/', p('cadastro.incluir'), asyncHandler(controller.incluir));
rotas.put('/:id', p('cadastro.alterar'), asyncHandler(controller.alterar));
rotas.post('/:id/desligamento', p('cadastro.alterar'), asyncHandler(controller.desligar));
rotas.post('/:id/reativacao', p('cadastro.alterar'), asyncHandler(controller.reativar));

module.exports = rotas;
