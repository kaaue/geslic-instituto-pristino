// Contas e perfis de acesso (RF_B8, RN21, RN27): exclusivo de quem tem
// usuario.gerenciar (o Administrador).

const express = require('express');
const controller = require('../controllers/usuarioController');
const { exigirPermissao } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();
rotas.use(exigirPermissao('usuario.gerenciar'));

rotas.get('/', asyncHandler(controller.listar));
// Troca de gestão: concede e revoga o perfil Administrador numa só operação (RN27)
rotas.post('/transferencia-administrador', asyncHandler(controller.transferirAdministrador));
rotas.get('/:id', asyncHandler(controller.buscar));
rotas.post('/', asyncHandler(controller.criar));
rotas.put('/:id', asyncHandler(controller.atualizar));
rotas.post('/:id/aprovacao', asyncHandler(controller.aprovar));
rotas.post('/:id/rejeicao', asyncHandler(controller.rejeitar));
rotas.patch('/:id/perfil', asyncHandler(controller.alterarPerfil));
rotas.patch('/:id/situacao', asyncHandler(controller.alterarSituacao));
rotas.post('/:id/senha-provisoria', asyncHandler(controller.definirSenhaProvisoria));

module.exports = rotas;
