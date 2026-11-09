// Estrutura das funções da ERS ainda não implementadas.
//
// modelPendente cria um model em que cada operação lança NotImplementedError
// (501) com a função e a operação; controllerPendente repassa a requisição
// ao model. Ao implementar uma função, troque o model pendente pelo real
// (consultas e regras) e escreva o controller, mantendo as rotas e as
// permissões já definidas.

const NotImplementedError = require('./NotImplementedError');

// operacoes: { nomeDoMetodo: 'descrição da operação' }
function modelPendente(funcao, operacoes) {
  return Object.fromEntries(Object.entries(operacoes).map(([metodo, descricao]) => [
    metodo,
    async () => { throw new NotImplementedError(`${funcao} - ${descricao}`); }
  ]));
}

function controllerPendente(model) {
  return Object.fromEntries(Object.keys(model).map((metodo) => [
    metodo,
    async (req, res) => {
      res.json(await model[metodo]({ params: req.params, query: req.query, corpo: req.body, usuario: req.usuario }));
    }
  ]));
}

module.exports = { modelPendente, controllerPendente };
