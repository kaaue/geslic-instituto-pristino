// Login, sessão, logout, expiração e invalidação de sessões.

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const t = require('./ajuda');

before(t.iniciar);
after(t.encerrar);
beforeEach(t.zerarLimites);

test('login válido abre sessão em cookie HttpOnly e devolve perfil e permissões do servidor', async () => {
  const c = t.cliente();
  const r = await c.post('/auth/login', { login: 'carlos.alves', senha: t.SENHAS.teste });
  assert.equal(r.status, 200);
  const cookie = r.cabecalhos.get('set-cookie');
  assert.match(cookie, /geslic_sessao=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.equal(r.corpo.usuario.perfil, 'Operador');
  assert.ok(r.corpo.usuario.permissoes.includes('cadastro.incluir'));
  assert.ok(!r.corpo.usuario.permissoes.includes('cadastro.alterar'));
  // nada secreto nos dados públicos
  assert.equal(r.corpo.usuario.senha_hash, undefined);
  assert.doesNotMatch(JSON.stringify(r.corpo), /scrypt\$/);

  const me = await c.get('/auth/me');
  assert.equal(me.status, 200);
  assert.equal(me.corpo.usuario.login, 'carlos.alves');
});

test('login aceita o e-mail no lugar do login', async () => {
  const r = await t.cliente().post('/auth/login', { login: 'carlos.alves@pristino.org.br', senha: t.SENHAS.teste });
  assert.equal(r.status, 200);
});

test('senha errada e login inexistente recebem a mesma resposta 401', async () => {
  const errada = await t.cliente().post('/auth/login', { login: 'carlos.alves', senha: 'Errada123' });
  const inexistente = await t.cliente().post('/auth/login', { login: 'ninguem', senha: 'Errada123' });
  assert.equal(errada.status, 401);
  assert.equal(inexistente.status, 401);
  assert.equal(errada.corpo.mensagem, inexistente.corpo.mensagem);
  assert.equal(errada.cabecalhos.get('set-cookie'), null);
});

test('sem sessão, as rotas protegidas respondem 401; cabeçalho de perfil do cliente é ignorado', async () => {
  const c = t.cliente();
  const r = await c.get('/equipamentos', { 'X-Perfil': 'administrador' });
  assert.equal(r.status, 401);
  assert.equal(r.corpo.codigo, 'NAO_AUTENTICADO');

  const forjado = t.cliente();
  forjado.cookie = 'geslic_sessao=token-inventado';
  const r2 = await forjado.get('/auth/me');
  assert.equal(r2.status, 401);
});

test('operador com cabeçalho X-Perfil de administrador continua sem permissão (403)', async () => {
  const op = await t.entrarOperador();
  const r = await op.delete('/projetos/7', { 'X-Perfil': 'administrador' });
  assert.equal(r.status, 403);
  assert.equal(r.corpo.codigo, 'SEM_PERMISSAO');
});

test('logout encerra a sessão no servidor: o mesmo cookie deixa de valer', async () => {
  const c = await t.entrarOperador();
  const cookieAntigo = c.cookie;
  assert.equal((await c.post('/auth/logout')).status, 200);
  const reaproveitado = t.cliente();
  reaproveitado.cookie = cookieAntigo;
  const r = await reaproveitado.get('/auth/me');
  assert.equal(r.status, 401);
  assert.equal(r.corpo.codigo, 'SESSAO_EXPIRADA');
});

test('sessão parada além do limite de inatividade expira', async () => {
  const c = await t.entrarOperador();
  await t.sql(`UPDATE sessao SET ultimo_uso_em = DATE_SUB(NOW(), INTERVAL 1 DAY)
                WHERE id_usuario = (SELECT id_usuario FROM usuario WHERE login = 'carlos.alves') AND encerrada_em IS NULL`);
  const r = await c.get('/auth/me');
  assert.equal(r.status, 401);
  const [sessao] = await t.sql(
    `SELECT motivo_encerramento FROM sessao s JOIN usuario u USING (id_usuario)
      WHERE u.login = 'carlos.alves' ORDER BY id_sessao DESC LIMIT 1`);
  assert.equal(sessao.motivo_encerramento, 'inatividade');
});

test('sessão além da validade máxima expira', async () => {
  const c = await t.entrarOperador();
  await t.sql(`UPDATE sessao SET expira_em = DATE_SUB(NOW(), INTERVAL 1 MINUTE)
                WHERE id_usuario = (SELECT id_usuario FROM usuario WHERE login = 'carlos.alves') AND encerrada_em IS NULL`);
  assert.equal((await c.get('/auth/me')).status, 401);
});

test('conta pendente não entra (403) e só descobre isso quem acerta a senha', async () => {
  await t.cliente().post('/auth/cadastro', {
    nome: 'Pessoa Pendente', email: 'pendente@pristino.org.br', login: 'pessoa.pendente',
    senha: 'Pendente2026', confirmacao: 'Pendente2026'
  });
  const certa = await t.cliente().post('/auth/login', { login: 'pessoa.pendente', senha: 'Pendente2026' });
  assert.equal(certa.status, 403);
  assert.equal(certa.corpo.codigo, 'CONTA_PENDENTE');
  const errada = await t.cliente().post('/auth/login', { login: 'pessoa.pendente', senha: 'Errada2026' });
  assert.equal(errada.status, 401);
});

test('conta desativada não entra e perde as sessões abertas na hora', async () => {
  const admin = await t.entrarAdmin();
  const op1 = await t.entrarOperador();
  const op2 = await t.entrarOperador();
  const [{ id_usuario: id }] = await t.sql(`SELECT id_usuario FROM usuario WHERE login = 'carlos.alves'`);

  const r = await admin.patch(`/usuarios/${id}/situacao`, { situacao: 'inativo', motivo: 'teste' });
  assert.equal(r.status, 200);
  assert.equal((await op1.get('/equipamentos')).status, 401);
  assert.equal((await op2.get('/auth/me')).status, 401);

  const login = await t.cliente().post('/auth/login', { login: 'carlos.alves', senha: t.SENHAS.teste });
  assert.equal(login.status, 403);
  assert.equal(login.corpo.codigo, 'CONTA_INATIVA');

  // reativa para os próximos testes
  assert.equal((await admin.patch(`/usuarios/${id}/situacao`, { situacao: 'ativo' })).status, 200);
  assert.equal((await t.cliente().post('/auth/login', { login: 'carlos.alves', senha: t.SENHAS.teste })).status, 200);
});

test('tentativas de login são limitadas por conta (429)', async () => {
  for (let i = 0; i < 5; i++) {
    assert.equal((await t.cliente().post('/auth/login', { login: 'ana.ribeiro', senha: 'Errada123' })).status, 401);
  }
  const bloqueado = await t.cliente().post('/auth/login', { login: 'ana.ribeiro', senha: t.SENHAS.teste });
  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.corpo.codigo, 'MUITAS_TENTATIVAS');
});

test('requisição de escrita vinda de outra origem é recusada', async () => {
  const c = await t.entrarAdmin();
  const r = await c.post('/projetos', {}, { Origin: 'http://site-malicioso.example' });
  assert.equal(r.status, 403);
  assert.equal(r.corpo.codigo, 'ORIGEM_NAO_PERMITIDA');
});
