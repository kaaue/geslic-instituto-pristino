// Rotas da RF_F1 - Gerenciar projetos institucionais.
//
// Quem pode o quê (RN21, RN17):
//   Operador e Administrador: consultar, incluir, prorrogar o término, encerrar e reabrir.
//   Somente Administrador: alterar os dados cadastrais e os participantes.
//   Projeto não é excluído (RN22).
// Prorrogar e encerrar são ações operacionais com permissão própria: não são
// tratadas como alteração de cadastro só porque gravam um UPDATE.

const express = require('express');
const controller = require('../controllers/projetoController');
const { exigirPermissao: p } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', p('cadastro.consultar'), asyncHandler(controller.listar));
// antes de /:id, senão "fontes" e "anos" seriam lidos como id
rotas.get('/fontes', p('cadastro.consultar'), asyncHandler(controller.listarFontes));
rotas.get('/anos', p('cadastro.consultar'), asyncHandler(controller.listarAnos));
rotas.get('/:id', p('cadastro.consultar'), asyncHandler(controller.buscar));
rotas.post('/', p('cadastro.incluir'), asyncHandler(controller.incluir));
rotas.put('/:id', p('cadastro.alterar'), asyncHandler(controller.alterar));
rotas.post('/:id/prorrogacao', p('projeto.prorrogar'), asyncHandler(controller.prorrogar));
rotas.post('/:id/encerramento', p('projeto.encerrar'), asyncHandler(controller.encerrar));
rotas.post('/:id/reabertura', p('projeto.encerrar'), asyncHandler(controller.reabrir));

module.exports = rotas;
