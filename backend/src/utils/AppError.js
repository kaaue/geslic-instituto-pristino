// Erro esperado da aplicação: regra de negócio violada, registro não
// encontrado, dado inválido. Carrega o status HTTP e o que vai no corpo da
// resposta; quem transforma isso em resposta é o middleware de erros.
//
// - erros: objeto campo -> mensagem, que o front usa para destacar o campo
// - sem erros: a resposta leva só a mensagem geral

class AppError extends Error {
  constructor(mensagem, status = 400, erros = null) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.erros = erros;
  }

  // Erros de validação de campos (400)
  static campos(erros) {
    return new AppError('Dados inválidos.', 400, erros);
  }

  static naoEncontrado(mensagem) {
    return new AppError(mensagem, 404);
  }

  // Operação que conflita com o estado atual do registro (409)
  static conflito(mensagem) {
    return new AppError(mensagem, 409);
  }

  static proibido(mensagem) {
    return new AppError(mensagem, 403);
  }
}

// Atalho para o padrão "valida e, se houver erro de campo, interrompe"
function lancarSeHouverErros(erros) {
  if (Object.keys(erros).length > 0) throw AppError.campos(erros);
}

module.exports = AppError;
module.exports.lancarSeHouverErros = lancarSeHouverErros;
