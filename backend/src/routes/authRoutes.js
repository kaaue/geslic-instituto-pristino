// Autenticação (seção 2.3.2 da ERS e RF_B9). Login, solicitação de acesso e
// recuperação de senha são públicos; /me e /logout exigem sessão.

const express = require('express');
const controller = require('../controllers/authController');
const { autenticar } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.post('/login', asyncHandler(controller.login));
rotas.post('/cadastro', asyncHandler(controller.solicitarCadastro));
rotas.post('/recuperacao', asyncHandler(controller.solicitarRecuperacao));
rotas.post('/redefinicao', asyncHandler(controller.redefinirSenha));

rotas.get('/me', autenticar, asyncHandler(controller.me));
rotas.post('/logout', autenticar, asyncHandler(controller.logout));

module.exports = rotas;
