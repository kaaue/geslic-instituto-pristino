// Perfis e matriz de permissões (RF_B9): exclusivo do Administrador.

const express = require('express');
const controller = require('../controllers/usuarioController');
const { exigirPermissao } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();
rotas.use(exigirPermissao('usuario.gerenciar'));

rotas.get('/', asyncHandler(controller.listarPerfis));
rotas.put('/:id/permissoes', asyncHandler(controller.definirPermissoes));

module.exports = rotas;
