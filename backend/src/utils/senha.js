// Hash e regras de senha das contas de acesso (RF_B9, seção 2.3.2 da ERS).
// A senha nunca é gravada em texto aberto: guardo o scrypt dela com um sal
// aleatório, no formato "scrypt$<sal>$<hash>", ambos em base64. O scrypt vem
// no próprio Node, então não há dependência extra.

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

// Hash fixo usado quando o login não existe: a verificação leva o mesmo tempo
// que a de uma conta real, e o tempo de resposta não revela quais logins existem.
const HASH_FICTICIO = gerarHashSenha(crypto.randomBytes(16).toString('hex'));

function verificarSenhaOuFicticio(senha, armazenado) {
  return verificarSenha(senha, armazenado || HASH_FICTICIO) && Boolean(armazenado);
}

// Regras para senhas novas (cadastro, troca, redefinição). As mesmas regras
// estão na interface, em frontend/src/utils/senha.js.
const REGRAS_SENHA = [
  { teste: (s) => s.length >= 8, texto: 'ter pelo menos 8 caracteres' },
  { teste: (s) => /[a-z]/.test(s), texto: 'ter uma letra minúscula' },
  { teste: (s) => /[A-Z]/.test(s), texto: 'ter uma letra maiúscula' },
  { teste: (s) => /\d/.test(s), texto: 'ter um número' }
];

// Devolve a mensagem de erro, ou null se a senha atende às regras
function problemaNaSenha(senha) {
  if (typeof senha !== 'string' || senha === '') return 'Informe a senha.';
  if (senha.length > 128) return 'A senha deve ter no máximo 128 caracteres.';
  const faltando = REGRAS_SENHA.filter((r) => !r.teste(senha)).map((r) => r.texto);
  return faltando.length ? `A senha precisa ${faltando.join(', ')}.` : null;
}

// Senha provisória legível (sem 0/O, 1/l), que sempre atende às regras.
// Usada na conta inicial e quando um Administrador redefine a senha de alguém.
function gerarSenhaProvisoria() {
  const grupos = ['abcdefghijkmnpqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789'];
  const todos = grupos.join('');
  const sortear = (texto) => texto[crypto.randomInt(texto.length)];
  const caracteres = [...grupos.map(sortear), ...Array.from({ length: 9 }, () => sortear(todos))];
  // embaralha para os três obrigatórios não ficarem sempre no começo
  for (let i = caracteres.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [caracteres[i], caracteres[j]] = [caracteres[j], caracteres[i]];
  }
  return caracteres.join('');
}

// Tokens de sessão e de recuperação: aleatórios, e no banco só o SHA-256 deles
function gerarToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = {
  gerarHashSenha, verificarSenha, verificarSenhaOuFicticio,
  problemaNaSenha, gerarSenhaProvisoria, gerarToken, hashToken
};
