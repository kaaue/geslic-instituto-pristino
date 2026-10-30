// Model da RF_S1 Consultar painel de acompanhamento - EM DESENVOLVIMENTO.
// Instâncias contratadas = em uso + vagas da vigência atual (RN06), apólices por situação e vencimentos.
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_S1 Consultar painel de acompanhamento', {
  consultar: 'indicadores do painel'
});
