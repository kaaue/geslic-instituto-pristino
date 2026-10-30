// Reúne as rotas da API sob /api.
//
// Públicas: saúde e autenticação (login, solicitação de acesso, recuperação
// de senha). Todas as outras passam por `autenticar`, e cada rota exige a
// permissão da operação (middlewares/auth.js). A matriz de permissões está
// no README e na tabela perfil_permissao.

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { autenticar } = require('../middlewares/auth');
const saude = require('../controllers/saudeController');

const rotas = express.Router();

rotas.get('/saude', asyncHandler(saude.verificar));
rotas.use('/auth', require('./authRoutes'));

// Daqui em diante, só com sessão válida
rotas.use(autenticar);

rotas.use('/conta', require('./contaRoutes'));
rotas.use('/usuarios', require('./usuarioRoutes'));
rotas.use('/perfis', require('./perfilRoutes'));
rotas.use('/historico', require('./historicoRoutes'));

// Funções básicas (RF_B1 a RF_B8; RF_B9 e RF_B10 acima)
rotas.use('/fornecedores', require('./fornecedorRoutes'));
rotas.use('/softwares', require('./softwareRoutes'));
rotas.use('/equipamentos', require('./equipamentoRoutes'));
rotas.use('/colaboradores', require('./colaboradorRoutes'));
rotas.use('/setores', require('./setorRoutes'));
rotas.use('/projetos', require('./projetoRoutes'));
rotas.use('/bens-seguraveis', require('./bemSeguravelRoutes'));
rotas.use('/tipos-seguro', require('./tipoSeguroRoutes'));

// Funções fundamentais e de saída
rotas.use('/licencas', require('./licencaRoutes'));
rotas.use('/apolices', require('./apoliceRoutes'));
rotas.use('/documentos', require('./documentoRoutes'));
rotas.use('/notificacoes', require('./notificacaoRoutes'));
rotas.use('/', require('./relatorioRoutes'));

module.exports = rotas;
