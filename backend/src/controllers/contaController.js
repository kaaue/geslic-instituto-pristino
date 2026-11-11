// Minha conta (RF_B8, Protótipo 4): cada pessoa atualiza nome e e-mail
// institucional e, no mesmo bloco, troca a senha após confirmar a atual.
// Perfil, login e situação não mudam por aqui.

const Usuario = require('../models/usuarioModel');
const { lancarSeHouverErros } = require('../utils/AppError');
const { validarDadosProprios, validarNovaSenha } = require('../models/usuarioValidacao');

async function atualizarDados(req, res) {
  const { erros, dados } = validarDadosProprios(req.body || {});
  lancarSeHouverErros(erros);
  const resultado = await Usuario.alterarDadosProprios(req.usuario.id_usuario, dados, req.sessao.idSessao);
  res.json({
    mensagem: resultado.senha_alterada
      ? 'Conta e senha atualizadas. As outras sessões abertas da sua conta foram encerradas.'
      : 'Dados da conta atualizados.',
    usuario: await Usuario.carregarAutenticado(req.usuario.id_usuario)
  });
}

async function alterarSenha(req, res) {
  const corpo = req.body || {};
  const erros = {};
  if (!corpo.senha_atual) erros.senha_atual = 'Informe a senha atual.';
  validarNovaSenha(corpo.senha, corpo.confirmacao, erros);
  lancarSeHouverErros(erros);
  await Usuario.alterarSenhaPropria(req.usuario.id_usuario, corpo.senha_atual, corpo.senha, req.sessao.idSessao);
  res.json({
    mensagem: 'Senha alterada. As outras sessões abertas da sua conta foram encerradas.',
    usuario: await Usuario.carregarAutenticado(req.usuario.id_usuario)
  });
}

module.exports = { atualizarDados, alterarSenha };
