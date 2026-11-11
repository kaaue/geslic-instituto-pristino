// Controller da RF_B7 - Gerenciar tipos de seguro e coberturas.

const TipoSeguro = require('../models/tipoSeguroModel');
const { validarTipo, validarCobertura } = require('../models/tipoSeguroValidacao');
const { controllerDeCadastro, idDaRota, contaDaSessao } = require('../utils/controllerCadastro');
const { lancarSeHouverErros } = require('../utils/AppError');
const { lerDataEfetiva, lerMotivo, hoje } = require('../utils/normalizacao');

const idCobertura = (req) => idDaRota(req, 'idCobertura');

function descricaoDaCobertura(req) {
  const { erros, dados } = validarCobertura(req.body || {});
  lancarSeHouverErros(erros);
  return dados.descricao;
}

module.exports = {
  ...controllerDeCadastro(TipoSeguro, validarTipo),

  async listarCoberturas(req, res) {
    res.json(await TipoSeguro.listarCoberturas(idDaRota(req)));
  },
  async incluirCobertura(req, res) {
    res.status(201).json(await TipoSeguro.incluirCobertura(idDaRota(req), descricaoDaCobertura(req), contaDaSessao(req)));
  },
  async alterarCobertura(req, res) {
    res.json(await TipoSeguro.alterarCobertura(idCobertura(req), descricaoDaCobertura(req), contaDaSessao(req)));
  },
  // A cobertura não tem coluna de data: a data efetiva (hoje, se não vier)
  // fica no evento do histórico (RN37)
  async inativarCobertura(req, res) {
    const erros = {};
    const corpo = req.body || {};
    const evento = {
      data_efetiva: corpo.data_efetiva ? lerDataEfetiva(corpo.data_efetiva, erros) : hoje(),
      motivo: lerMotivo(corpo.motivo, erros)
    };
    lancarSeHouverErros(erros);
    res.json(await TipoSeguro.inativarCobertura(idCobertura(req), evento, contaDaSessao(req)));
  },
  async reativarCobertura(req, res) {
    res.json(await TipoSeguro.reativarCobertura(idCobertura(req), contaDaSessao(req)));
  }
};
