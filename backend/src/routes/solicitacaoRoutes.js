// Rotas da RF_B10 - Gerenciar solicitações de ajuste cadastral (RN36, RN42).
// Não há item de menu: a criação e o acompanhamento ficam no painel, com
// atalho nos cadastros.
//   Todos (painel.consultar): acompanhar as solicitações de todos os operadores.
//   Operador (ajuste.solicitar): emitir. O Administrador corrige direto.
//   Administrador (ajuste.concluir): concluir e indicar presença.

const express = require('express');
const controller = require('../controllers/solicitacaoController');
const { exigirPermissao: p } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/painel', p('painel.consultar'), asyncHandler(controller.painel));
rotas.get('/entidades', p('ajuste.solicitar'), asyncHandler(controller.entidades));
rotas.get('/opcoes', p('ajuste.solicitar'), asyncHandler(controller.opcoes));
rotas.get('/:id', p('painel.consultar'), asyncHandler(controller.detalhe));
rotas.post('/', p('ajuste.solicitar'), asyncHandler(controller.criar));
rotas.post('/:id/conclusao', p('ajuste.concluir'), asyncHandler(controller.concluir));
rotas.put('/:id/presenca', p('ajuste.concluir'), asyncHandler(controller.marcarPresenca));
rotas.delete('/:id/presenca', p('ajuste.concluir'), asyncHandler(controller.sairDaPresenca));

module.exports = rotas;
