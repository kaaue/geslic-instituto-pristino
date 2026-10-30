// Erro esperado da aplicação: regra de negócio violada, registro não
// encontrado, dado inválido, falta de sessão ou de permissão. Carrega o status
// HTTP e o que vai no corpo da resposta; quem transforma isso em resposta é o
// middleware de erros.
//
// - erros: objeto campo -> mensagem, que o front usa para destacar o campo
// - codigo: identificador estável para a interface reagir (ex.: SESSAO_EXPIRADA)
// - sem erros: a resposta leva só a mensagem geral

class AppError extends Error {
  constructor(mensagem, status = 400, erros = null, codigo = null) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.erros = erros;
    this.codigo = codigo;
  }

  // Erros de validação de campos (400)
  static campos(erros) {
    return new AppError('Dados inválidos.', 400, erros);
  }

  // Sem sessão válida (401): a interface volta para o login
  static naoAutenticado(mensagem = 'Faça login para continuar.', codigo = 'NAO_AUTENTICADO') {
    return new AppError(mensagem, 401, null, codigo);
  }

  // Sessão válida, mas sem permissão para a operação (403)
  static proibido(mensagem = 'Sua conta não tem permissão para esta operação.', codigo = 'SEM_PERMISSAO') {
    return new AppError(mensagem, 403, null, codigo);
  }

  static naoEncontrado(mensagem) {
    return new AppError(mensagem, 404);
  }

  // Operação que conflita com o estado atual do registro (409)
  static conflito(mensagem) {
    return new AppError(mensagem, 409);
  }

  static muitasTentativas(mensagem) {
    return new AppError(mensagem, 429, null, 'MUITAS_TENTATIVAS');
  }
}

// Atalho para o padrão "valida e, se houver erro de campo, interrompe"
function lancarSeHouverErros(erros) {
  if (Object.keys(erros).length > 0) throw AppError.campos(erros);
}

module.exports = AppError;
module.exports.lancarSeHouverErros = lancarSeHouverErros;
