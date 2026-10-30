// Model da RF_S2 a RF_S6 Relatórios - EM DESENVOLVIMENTO.
// Licenças por situação (S2), mapa de licenças (S3), apólices por situação (S4), bens e pessoas segurados (S5) e financeiro (S6).
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_S2 a RF_S6 Relatórios', {
  licencas: 'relatório de licenças por situação (RF_S2)',
  mapaLicencas: 'mapa de licenças (RF_S3)',
  apolices: 'relatório de apólices por situação (RF_S4)',
  bensSegurados: 'relatório de bens e pessoas segurados (RF_S5)',
  financeiro: 'relatório financeiro de licenças e apólices (RF_S6)'
});
