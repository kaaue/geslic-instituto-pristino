// Model da RF_B7 Gerenciar bens seguráveis - EM DESENVOLVIMENTO.
// Identificação conforme a categoria (placa, endereço, número de série), sem etiqueta do Instituto (RN20).
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_B7 Gerenciar bens seguráveis', {
  listar: 'consulta',
  buscar: 'consulta de um registro',
  incluir: 'inclusão',
  alterar: 'alteração',
  inativar: 'inativação',
  excluir: 'exclusão'
});
