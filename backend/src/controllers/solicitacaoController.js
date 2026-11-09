// Controller da RF_B10 - Gerenciar solicitações de ajuste cadastral.
// Quem pode cada operação está nas rotas: emitir, só o Operador
// (ajuste.solicitar); concluir e marcar presença, só o Administrador
// (ajuste.concluir); acompanhar pelo painel, todos (painel.consultar).

const Solicitacao = require('../models/solicitacaoModel');
const { lancarSeHouverErros } = require('../utils/AppError');
const { normalizarTexto } = require('../utils/normalizacao');
const { idDaRota } = require('../utils/controllerCadastro');

function validarEmissao(corpo) {
  const erros = {};
  const entidade = corpo.entidade;
  const idRegistro = Number(corpo.id_registro);
  const descricao = normalizarTexto(corpo.descricao);
  if (!Solicitacao.ENTIDADES[entidade]) erros.entidade = 'Selecione o tipo de cadastro.';
  if (!Number.isInteger(idRegistro) || idRegistro <= 0) erros.id_registro = 'Selecione o cadastro afetado.';
  if (!descricao) erros.descricao = 'Descreva o ajuste.';
  else if (descricao.length < 5) erros.descricao = 'Descreva o ajuste com ao menos 5 caracteres.';
  else if (descricao.length > 1000) erros.descricao = 'Use no máximo 1000 caracteres.';
  lancarSeHouverErros(erros);
  return { entidade, id_registro: idRegistro, descricao };
}

module.exports = {
  async entidades(req, res) {
    res.json(Solicitacao.entidades());
  },
  async opcoes(req, res) {
    res.json(await Solicitacao.opcoes(req.query.entidade));
  },
  async painel(req, res) {
    res.json(await Solicitacao.painel(req.usuario, { pagina: req.query.pagina }));
  },
  async detalhe(req, res) {
    res.json(await Solicitacao.detalhe(idDaRota(req), req.usuario));
  },
  async criar(req, res) {
    res.status(201).json(await Solicitacao.criar(validarEmissao(req.body || {}), req.usuario));
  },
  async concluir(req, res) {
    const observacao = normalizarTexto(req.body?.observacao);
    if (observacao && observacao.length > 500) lancarSeHouverErros({ observacao: 'Use no máximo 500 caracteres.' });
    res.json(await Solicitacao.concluir(idDaRota(req), observacao, req.usuario));
  },
  async marcarPresenca(req, res) {
    const acao = req.body?.acao === 'atualizando' ? 'atualizando' : 'visualizando';
    res.json(await Solicitacao.marcarPresenca(idDaRota(req), acao, req.usuario));
  },
  async sairDaPresenca(req, res) {
    res.json(await Solicitacao.sairDaPresenca(idDaRota(req), req.usuario));
  }
};
