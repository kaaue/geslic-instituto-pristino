// Model da RF_F11 Anexar e consultar documentos PDF - EM DESENVOLVIMENTO.
// Só licenças e apólices recebem PDFs, por vigência, na pasta central; nenhum arquivo é sobrescrito (RN23).
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_F11 Anexar e consultar documentos PDF', {
  listar: 'consulta dos documentos de uma vigência',
  baixar: 'visualização de um documento',
  anexar: 'envio de documentos'
});
