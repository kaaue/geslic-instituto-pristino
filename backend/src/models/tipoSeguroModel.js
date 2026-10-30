// Model da RF_B8 Gerenciar tipos de seguro e coberturas - EM DESENVOLVIMENTO.
// Coberturas usadas em apólices não são excluídas, apenas inativadas.
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_B8 Gerenciar tipos de seguro e coberturas', {
  listar: 'consulta',
  buscar: 'consulta de um registro',
  incluir: 'inclusão',
  alterar: 'alteração',
  inativar: 'inativação',
  excluir: 'exclusão',
  listarCoberturas: 'consulta das coberturas do tipo',
  incluirCobertura: 'inclusão de cobertura',
  alterarCobertura: 'alteração de cobertura',
  inativarCobertura: 'inativação de cobertura',
  excluirCobertura: 'exclusão de cobertura'
});
