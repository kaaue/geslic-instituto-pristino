// Model da RF_B1 Gerenciar fornecedores e seguradoras - EM DESENVOLVIMENTO.
// CNPJ único; com licenças ou apólices vinculadas, só inativação (RN22).
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_B1 Gerenciar fornecedores e seguradoras', {
  listar: 'consulta',
  buscar: 'consulta de um registro',
  incluir: 'inclusão',
  alterar: 'alteração',
  inativar: 'inativação',
  excluir: 'exclusão'
});
