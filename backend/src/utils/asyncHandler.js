// O Express 4 não captura erros de funções async: sem isto, um erro dentro de
// um controller deixaria a requisição pendurada. O embrulho manda qualquer
// erro para o middleware de erros, e os controllers não precisam de try/catch.

module.exports = function asyncHandler(controller) {
  return (req, res, proximo) => Promise.resolve(controller(req, res, proximo)).catch(proximo);
};
