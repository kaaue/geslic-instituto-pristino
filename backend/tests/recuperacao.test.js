// Recuperação de senha por e-mail: resposta genérica, token de uso único,
// validade e invalidação das sessões.

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const t = require('./ajuda');
const { caixaDeTeste } = require('../src/utils/email');

before(t.iniciar);
after(t.encerrar);
beforeEach(() => {
  t.zerarLimites();
  caixaDeTeste.length = 0;
});

const tokenDoEmail = () => caixaDeTeste.at(-1).texto.match(/#token=([\w-]+)/)[1];

test('a resposta é a mesma para e-mail cadastrado e não cadastrado', async () => {
  const existe = await t.cliente().post('/auth/recuperacao', { email: 'carlos.alves@pristino.org.br' });
  const naoExiste = await t.cliente().post('/auth/recuperacao', { email: 'ninguem@pristino.org.br' });
  assert.equal(existe.status, 200);
  assert.equal(naoExiste.status, 200);
  assert.deepEqual(existe.corpo, naoExiste.corpo);
  assert.equal(caixaDeTeste.length, 1);
  assert.equal(caixaDeTeste[0].para, 'carlos.alves@pristino.org.br');
});

test('o banco guarda só o hash do token, e a redefinição encerra as sessões', async () => {
  const sessaoAberta = await t.entrarOperador();
  await t.cliente().post('/auth/recuperacao', { email: 'carlos.alves@pristino.org.br' });
  const token = tokenDoEmail();
  const linhas = await t.sql('SELECT token_hash FROM recuperacao_senha');
  assert.ok(linhas.every((l) => l.token_hash !== token && /^[0-9a-f]{64}$/.test(l.token_hash)));

  const fraca = await t.cliente().post('/auth/redefinicao', { token, senha: 'fraca', confirmacao: 'fraca' });
  assert.equal(fraca.status, 400);

  const r = await t.cliente().post('/auth/redefinicao', { token, senha: 'NovaSenha2026', confirmacao: 'NovaSenha2026' });
  assert.equal(r.status, 200);
  assert.equal((await sessaoAberta.get('/auth/me')).status, 401);
  assert.equal((await t.cliente().post('/auth/login', { login: 'carlos.alves', senha: t.SENHAS.teste })).status, 401);
  assert.equal((await t.cliente().post('/auth/login', { login: 'carlos.alves', senha: 'NovaSenha2026' })).status, 200);
});

test('o token não pode ser reutilizado', async () => {
  await t.cliente().post('/auth/recuperacao', { email: 'ana.ribeiro@pristino.org.br' });
  const token = tokenDoEmail();
  assert.equal((await t.cliente().post('/auth/redefinicao', { token, senha: 'Primeira2026', confirmacao: 'Primeira2026' })).status, 200);
  const segunda = await t.cliente().post('/auth/redefinicao', { token, senha: 'Segunda2026', confirmacao: 'Segunda2026' });
  assert.equal(segunda.status, 400);
  assert.equal(segunda.corpo.codigo, 'TOKEN_INVALIDO');
});

test('token expirado é recusado', async () => {
  await t.cliente().post('/auth/recuperacao', { email: 'admin@pristino.org.br' });
  const token = tokenDoEmail();
  await t.sql('UPDATE recuperacao_senha SET expira_em = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE usada_em IS NULL');
  const r = await t.cliente().post('/auth/redefinicao', { token, senha: 'Expirado2026', confirmacao: 'Expirado2026' });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.codigo, 'TOKEN_INVALIDO');
});

test('um pedido novo invalida o link anterior', async () => {
  await t.cliente().post('/auth/recuperacao', { email: 'admin@pristino.org.br' });
  const primeiro = tokenDoEmail();
  await t.cliente().post('/auth/recuperacao', { email: 'admin@pristino.org.br' });
  const r = await t.cliente().post('/auth/redefinicao', { token: primeiro, senha: 'Antigo2026x', confirmacao: 'Antigo2026x' });
  assert.equal(r.status, 400);
  assert.equal((await t.cliente().post('/auth/redefinicao', {
    token: tokenDoEmail(), senha: t.SENHAS.admin, confirmacao: t.SENHAS.admin
  })).status, 200);
});

test('conta pendente ou inativa não recebe link', async () => {
  await t.cliente().post('/auth/cadastro', {
    nome: 'Pendente Recupera', email: 'pendente.rec@pristino.org.br', login: 'pendente.rec',
    senha: 'Pendente2026', confirmacao: 'Pendente2026'
  });
  const r = await t.cliente().post('/auth/recuperacao', { email: 'pendente.rec@pristino.org.br' });
  assert.equal(r.status, 200);
  assert.equal(caixaDeTeste.length, 0);
});

test('pedidos de recuperação são limitados (429)', async () => {
  const c = t.cliente();
  for (let i = 0; i < 5; i++) assert.equal((await c.post('/auth/recuperacao', { email: `x${i}@pristino.org.br` })).status, 200);
  const r = await c.post('/auth/recuperacao', { email: 'x9@pristino.org.br' });
  assert.equal(r.status, 429);
});
