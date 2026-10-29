// Hash de senha das contas de acesso (RF_B9). A senha nunca é gravada em
// texto aberto: guardo o scrypt dela com um sal aleatório, no formato
// "scrypt$<sal>$<hash>", ambos em base64. O scrypt vem no próprio Node, então
// não há dependência extra. O login, quando chegar, usa verificarSenha.

const crypto = require('crypto');

const TAMANHO_HASH = 64;

function gerarHashSenha(senha) {
  const sal = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(senha), sal, TAMANHO_HASH);
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`;
}

function verificarSenha(senha, armazenado) {
  const [algoritmo, sal, hash] = String(armazenado || '').split('$');
  if (algoritmo !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64');
  const calculado = crypto.scryptSync(String(senha), Buffer.from(sal, 'base64'), esperado.length);
  // comparação em tempo constante, para não vazar informação pelo tempo de resposta
  return crypto.timingSafeEqual(esperado, calculado);
}

module.exports = { gerarHashSenha, verificarSenha };
