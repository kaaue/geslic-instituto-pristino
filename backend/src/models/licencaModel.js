// Model da RF_F2 a RF_F7 Licenças de software - EM DESENVOLVIMENTO.
// Registro (F1), alocação e utilização (F2), transferência (F3), liberação (F4), renovação (F5) e inativação (F6). A chave de ativação é cifrada e só revelada a perfis com visualiza_dados_sensiveis (seção 2.3.2).
// Cada operação responde 501 até ser implementada (ver utils/pendente.js).

const { modelPendente } = require('../utils/pendente');

module.exports = modelPendente('RF_F2 a RF_F7 Licenças de software', {
  listar: 'consulta das licenças (RF_S2)',
  buscar: 'consulta de uma licença e suas instâncias',
  registrar: 'registro de licença (RF_F2)',
  alterar: 'correção dos dados da licença',
  excluir: 'exclusão de licença sem vínculos',
  revelarChave: 'exibição da chave de ativação',
  alocar: 'alocação de instância e registro de utilização (RF_F3)',
  transferir: 'transferência de instância (RF_F4)',
  liberar: 'liberação de instância (RF_F5)',
  renovar: 'renovação de licença (RF_F6)',
  inativar: 'inativação de licença (RF_F7)',
  inativarInstancia: 'inativação de instância (RF_F7)'
});
