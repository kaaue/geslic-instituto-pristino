// Licenças de software: RF_F1 a RF_F6 e a consulta da RF_S2 (em desenvolvimento: 501).
// Permissões (RN21): registrar, movimentar, renovar e inativar - Operador e
// Administrador; corrigir e excluir - somente o Administrador. A chave de
// ativação só é revelada a perfis com visualiza_dados_sensiveis (seção 2.3.2).

const express = require('express');
const controller = require('../controllers/licencaController');
const { exigirPermissao: p, exigirDadosSensiveis } = require('../middlewares/auth');
const asyncHandler = require('../utils/asyncHandler');

const rotas = express.Router();

rotas.get('/', p('licenca.consultar'), asyncHandler(controller.listar));
rotas.get('/:id', p('licenca.consultar'), asyncHandler(controller.buscar));
rotas.post('/', p('licenca.registrar'), asyncHandler(controller.registrar));
rotas.put('/:id', p('cadastro.alterar'), asyncHandler(controller.alterar));
rotas.delete('/:id', p('cadastro.excluir'), asyncHandler(controller.excluir));
rotas.get('/:id/chave', p('licenca.consultar'), exigirDadosSensiveis, asyncHandler(controller.revelarChave));
rotas.post('/:id/renovacao', p('licenca.renovar'), asyncHandler(controller.renovar));
rotas.post('/:id/inativacao', p('licenca.inativar'), asyncHandler(controller.inativar));

// Movimentações de uma instância
rotas.post('/instancias/:idInstancia/alocacao', p('licenca.movimentar'), asyncHandler(controller.alocar));
rotas.post('/instancias/:idInstancia/transferencia', p('licenca.movimentar'), asyncHandler(controller.transferir));
rotas.post('/instancias/:idInstancia/liberacao', p('licenca.movimentar'), asyncHandler(controller.liberar));
rotas.post('/instancias/:idInstancia/inativacao', p('licenca.inativar'), asyncHandler(controller.inativarInstancia));

module.exports = rotas;
