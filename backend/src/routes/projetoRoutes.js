// Rotas da RF_B6 - Gerenciar projetos institucionais.
//
// Quem pode o quê (RN21):
//   Operador e Administrador: consultar, incluir, prorrogar o término e encerrar.
//   Somente Administrador: alterar os dados cadastrais e excluir.

const express = require('express');
const controller = require('../controllers/projetoController');
const { exigirAdministrador } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', asyncHandler(controller.listar));
// antes de /:id, senão "fontes" seria lido como id
rotas.get('/fontes', asyncHandler(controller.listarFontes));
rotas.get('/:id', asyncHandler(controller.buscar));
rotas.post('/', asyncHandler(controller.incluir));
rotas.put('/:id', exigirAdministrador, asyncHandler(controller.alterar));
rotas.post('/:id/prorrogacao', asyncHandler(controller.prorrogar));
rotas.post('/:id/encerramento', asyncHandler(controller.encerrar));
rotas.delete('/:id', exigirAdministrador, asyncHandler(controller.excluir));

module.exports = rotas;
