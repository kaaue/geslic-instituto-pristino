// Limite de tentativas por janela de tempo, contra adivinhação de senhas e
// abuso da recuperação. Fica em memória: basta para um único servidor da
// rede interna (ERS 2.3.1) e é zerado quando a API reinicia.

const { limites } = require('../config/env');

function criarLimitador(maximo, janelaMinutos = limites.janelaMinutos) {
  const janelaMs = janelaMinutos * 60 * 1000;
  const registros = new Map();

  function recentes(chave) {
    const limite = Date.now() - janelaMs;
    const lista = (registros.get(chave) || []).filter((t) => t > limite);
    if (lista.length) registros.set(chave, lista);
    else registros.delete(chave);
    return lista;
  }

  return {
    excedido: (chave) => recentes(chave).length >= maximo,
    registrar: (chave) => registros.set(chave, [...recentes(chave), Date.now()]),
    limpar: (chave) => registros.delete(chave),
    limparTudo: () => registros.clear()
  };
}

// Falhas de login por conta (login informado) e por endereço de origem
const loginPorConta = criarLimitador(limites.loginPorConta);
const loginPorIp = criarLimitador(limites.loginPorIp);
// Pedidos de recuperação por endereço de origem e por e-mail
const recuperacaoPorIp = criarLimitador(limites.recuperacaoPorIp);
const recuperacaoPorEmail = criarLimitador(3, 60);

function limparTodos() {
  [loginPorConta, loginPorIp, recuperacaoPorIp, recuperacaoPorEmail].forEach((l) => l.limparTudo());
}

module.exports = { loginPorConta, loginPorIp, recuperacaoPorIp, recuperacaoPorEmail, limparTodos };
