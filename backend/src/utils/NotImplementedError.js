// Marca uma rota ou função que já tem lugar na estrutura, mas cuja função
// básica ainda não foi implementada. Responde 501 em vez de 500, para deixar
// claro que não é falha, e sim algo que ainda vai chegar.

const AppError = require('./AppError');

class NotImplementedError extends AppError {
  constructor(funcionalidade = 'Esta funcionalidade') {
    super(`${funcionalidade} ainda não foi implementada.`, 501);
    this.name = 'NotImplementedError';
  }
}

module.exports = NotImplementedError;
