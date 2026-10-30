// Marca uma operação que já tem lugar na estrutura (rota, permissão,
// controller e model), mas cuja função ainda não foi implementada. Responde
// 501 em vez de 500, para deixar claro que não é falha, e sim algo que ainda
// vai chegar. Nunca devolve lista vazia ou sucesso fictício no lugar.

const AppError = require('./AppError');

class NotImplementedError extends AppError {
  constructor(funcionalidade = 'Esta funcionalidade') {
    super(`${funcionalidade}: em desenvolvimento, ainda não implementada.`, 501, null, 'NAO_IMPLEMENTADO');
    this.name = 'NotImplementedError';
  }
}

module.exports = NotImplementedError;
