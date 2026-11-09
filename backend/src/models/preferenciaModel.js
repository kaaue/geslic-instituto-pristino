// Model da RF_B10 Configurar preferências de notificação - EM DESENVOLVIMENTO.
// Antecedências da própria conta, em meses (padrões: seis e um). Vale para os próximos avisos (RN24).
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_B10 Configurar preferências de notificação', {
  consultar: 'consulta das antecedências da conta',
  salvar: 'alteração das antecedências da conta'
});
