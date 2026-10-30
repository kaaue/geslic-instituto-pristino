// Model da RF_S8 Consultar a central de notificações - EM DESENVOLVIMENTO.
// Avisos da própria conta, gerados pela rotina RF_F12; abrir a lista marca como lidos (RN24).
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_S8 Consultar a central de notificações', {
  listar: 'consulta dos avisos da conta',
  contarNaoLidas: 'contador de avisos não lidos',
  marcarLidas: 'marcação dos avisos como lidos'
});
