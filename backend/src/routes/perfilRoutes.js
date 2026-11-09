// Perfis e matriz de permissões (RF_B8): exclusivo do Administrador. A
// matriz é explicativa e não editável (RN41): a tentativa de editar responde 405.

const express = require('express');
const controller = require('../controllers/usuarioController');
const { exigirPermissao } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();
rotas.use(exigirPermissao('usuario.gerenciar'));

rotas.get('/', asyncHandler(controller.listarPerfis));
rotas.put('/:id/permissoes', asyncHandler(controller.recusarEdicaoDePermissoes));

module.exports = rotas;
