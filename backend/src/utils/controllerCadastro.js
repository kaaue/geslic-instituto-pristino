// Controller padrão dos cadastros das funções básicas: lê a requisição,
// valida a entrada, chama o model e devolve a resposta. Quem pode cada
// operação (RN21) é decidido nas rotas; as regras dos dados, no model.
//
// Operações: listar, buscar, incluir, alterar (correção, só Administrador),
// inativar (com data efetiva, RN37), reativar (só Administrador) e excluir
// (sem vínculos, RN22).

const { lancarSeHouverErros } = require('./AppError');
const { lerDataEfetiva, lerMotivo } = require('./normalizacao');

// Data efetiva e motivo de uma inativação ou desligamento (RN37)
function validarEvento(corpo, { motivoObrigatorio = false } = {}) {
  const erros = {};
  const dataEfetiva = lerDataEfetiva(corpo?.data_efetiva, erros);
  const motivo = lerMotivo(corpo?.motivo, erros, { obrigatorio: motivoObrigatorio });
  lancarSeHouverErros(erros);
  return { data_efetiva: dataEfetiva, motivo };
}

const idDaRota = (req, nome = 'id') => Number(req.params[nome]);
const contaDaSessao = (req) => req.usuario.id_usuario;

function controllerDeCadastro(Model, validar, opcoesEvento = {}) {
  return {
    async listar(req, res) {
      res.json(await Model.listar(req.query));
    },
    async buscar(req, res) {
      res.json(await Model.buscar(idDaRota(req)));
    },
    async incluir(req, res) {
      const { erros, dados } = validar(req.body || {});
      lancarSeHouverErros(erros);
      res.status(201).json(await Model.incluir(dados, contaDaSessao(req)));
    },
    async alterar(req, res) {
      const { erros, dados } = validar(req.body || {}, { edicao: true });
      lancarSeHouverErros(erros);
      res.json(await Model.alterar(idDaRota(req), dados, contaDaSessao(req)));
    },
    async inativar(req, res) {
      res.json(await Model.inativar(idDaRota(req), validarEvento(req.body, opcoesEvento), contaDaSessao(req)));
    },
    async reativar(req, res) {
      res.json(await Model.reativar(idDaRota(req), contaDaSessao(req)));
    },
    async excluir(req, res) {
      res.json(await Model.excluir(idDaRota(req), contaDaSessao(req)));
    }
  };
}

module.exports = { controllerDeCadastro, validarEvento, idDaRota, contaDaSessao };
