// Model da RF_B2 Gerenciar softwares - EM DESENVOLVIMENTO.
// O software descreve o produto; a licença registra a aquisição. Com licença, só inativação (RN22).
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_B2 Gerenciar softwares', {
  listar: 'consulta',
  buscar: 'consulta de um registro',
  incluir: 'inclusão',
  alterar: 'alteração',
  inativar: 'inativação',
  excluir: 'exclusão'
});
