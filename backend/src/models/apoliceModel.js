// Model da RF_F8 a RF_F11 Apólices de seguro - EM DESENVOLVIMENTO.
// Registro (F7), vínculo de bens e pessoas (F8), renovação seletiva (F9, RN14) e cancelamento (F10).
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_F8 a RF_F11 Apólices de seguro', {
  listar: 'consulta das apólices (RF_S4)',
  buscar: 'consulta de uma apólice e suas vigências',
  registrar: 'registro de apólice (RF_F8)',
  alterar: 'correção dos dados da apólice',
  vincularItens: 'vínculo de bens e pessoas (RF_F9)',
  renovar: 'renovação de apólice (RF_F10)',
  cancelar: 'cancelamento de apólice (RF_F11)'
});
