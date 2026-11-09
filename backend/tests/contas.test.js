// Autocadastro, aprovação, gerenciamento de contas, perfis e permissões (RF_B9, RN21, RN27).

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const t = require('./ajuda');

before(t.iniciar);
after(t.encerrar);
beforeEach(t.zerarLimites);

const idDe = async (login) => (await t.sql('SELECT id_usuario FROM usuario WHERE login = ?', [login]))[0]?.id_usuario;
const perfilId = async (nome) => (await t.sql('SELECT id_perfil FROM perfil WHERE nome = ?', [nome]))[0].id_perfil;

test('autocadastro valida os campos no backend', async () => {
  const r = await t.cliente().post('/auth/cadastro', {
    nome: 'A', email: 'invalido', login: 'X Y', senha: 'curta', confirmacao: 'outra'
  });
  assert.equal(r.status, 400);
  assert.ok(r.corpo.erros.nome && r.corpo.erros.email && r.corpo.erros.login && r.corpo.erros.senha);

  const confirmacao = await t.cliente().post('/auth/cadastro', {
    nome: 'Pessoa Válida', email: 'valida@pristino.org.br', login: 'pessoa.valida',
    senha: 'Valida2026', confirmacao: 'Valida2027'
  });
  assert.equal(confirmacao.status, 400);
  assert.ok(confirmacao.corpo.erros.confirmacao);
});

test('autocadastro não aceita privilégios enviados pelo cliente', async () => {
  const r = await t.cliente().post('/auth/cadastro', {
    nome: 'Quer Ser Admin', email: 'quer.admin@pristino.org.br', login: 'quer.admin',
    senha: 'Admin2026x', confirmacao: 'Admin2026x',
    id_perfil: await perfilId('Administrador'), perfil: 'Administrador', situacao: 'ativo', id_colaborador: 1
  });
  assert.equal(r.status, 201);
  const [conta] = await t.sql(
    `SELECT u.situacao, p.nome AS perfil, u.id_colaborador FROM usuario u JOIN perfil p USING (id_perfil)
      WHERE u.login = 'quer.admin'`);
  assert.deepEqual({ ...conta }, { situacao: 'pendente', perfil: 'Operador', id_colaborador: null });
  assert.equal((await t.cliente().post('/auth/login', { login: 'quer.admin', senha: 'Admin2026x' })).status, 403);
});

test('login e e-mail repetidos são recusados no autocadastro', async () => {
  const r = await t.cliente().post('/auth/cadastro', {
    nome: 'Outra Pessoa', email: 'carlos.alves@pristino.org.br', login: 'admin',
    senha: 'Outra2026x', confirmacao: 'Outra2026x'
  });
  assert.equal(r.status, 400);
  assert.ok(r.corpo.erros.login && r.corpo.erros.email);
});

test('aprovação administrativa libera o acesso com o perfil escolhido e o vínculo validado', async () => {
  await t.cliente().post('/auth/cadastro', {
    nome: 'Juliana Moreira', email: 'juliana.conta@pristino.org.br', login: 'juliana.moreira',
    senha: 'Juliana2026', confirmacao: 'Juliana2026'
  });
  const admin = await t.entrarAdmin();
  const id = await idDe('juliana.moreira');

  // colaborador já vinculado a outra conta (Carlos, id 3) é recusado
  const ocupado = await admin.post(`/usuarios/${id}/aprovacao`, { id_perfil: await perfilId('Operador'), id_colaborador: 3 });
  assert.equal(ocupado.status, 400);
  assert.ok(ocupado.corpo.erros.id_colaborador);

  // conceder Administrador exige motivo (RN27)
  const semMotivo = await admin.post(`/usuarios/${id}/aprovacao`, { id_perfil: await perfilId('Administrador') });
  assert.equal(semMotivo.status, 400);
  assert.ok(semMotivo.corpo.erros.motivo);

  const r = await admin.post(`/usuarios/${id}/aprovacao`, { id_perfil: await perfilId('Operador'), id_colaborador: 4 });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.situacao, 'ativo');
  assert.equal(r.corpo.nome_colaborador, 'Juliana Moreira');
  assert.equal((await t.cliente().post('/auth/login', { login: 'juliana.moreira', senha: 'Juliana2026' })).status, 200);
});

test('recusa remove a solicitação pendente e fica no histórico', async () => {
  await t.cliente().post('/auth/cadastro', {
    nome: 'Recusada Silva', email: 'recusada@pristino.org.br', login: 'recusada',
    senha: 'Recusada2026', confirmacao: 'Recusada2026'
  });
  const admin = await t.entrarAdmin();
  const id = await idDe('recusada');
  assert.equal((await admin.post(`/usuarios/${id}/rejeicao`, { motivo: 'não pertence ao Instituto' })).status, 200);
  assert.equal(await idDe('recusada'), undefined);
  const [evento] = await t.sql(`SELECT tipo, motivo FROM movimentacao WHERE entidade = 'usuario' AND id_registro = ?`, [id]);
  assert.equal(evento.tipo, 'rejeicao');
});

test('operador não acessa contas, perfis nem histórico, e não concede perfil a si mesmo', async () => {
  const op = await t.entrarOperador();
  const meuId = await idDe('carlos.alves');
  for (const [metodo, caminho, corpo] of [
    ['get', '/usuarios'], ['get', '/perfis'], ['get', '/historico'],
    ['post', '/usuarios', { nome: 'X', email: 'x@x.org', login: 'xxx', id_perfil: 1 }],
    ['patch', `/usuarios/${meuId}/perfil`, { id_perfil: await perfilId('Administrador'), motivo: 'quero' }],
    ['put', '/perfis/2/permissoes', { permissoes: ['usuario.gerenciar'] }]
  ]) {
    const r = await op[metodo](caminho, corpo);
    assert.equal(r.status, 403, `${metodo.toUpperCase()} ${caminho}`);
  }
  // nem pela própria conta: Minha conta ignora perfil
  const proprio = await op.put('/conta', {
    nome: 'Carlos Eduardo Alves', email: 'carlos.alves@pristino.org.br', id_perfil: await perfilId('Administrador')
  });
  assert.equal(proprio.status, 200);
  assert.equal(proprio.corpo.usuario.perfil, 'Operador');
});

test('o último Administrador ativo não pode ser rebaixado nem desativado', async () => {
  const admin = await t.entrarAdmin();
  const idAna = await idDe('ana.ribeiro');
  const idAdmin = await idDe('admin');
  const operador = await perfilId('Operador');

  // com dois administradores, rebaixar um é permitido
  const r1 = await admin.patch(`/usuarios/${idAna}/perfil`, { id_perfil: operador, motivo: 'troca de gestão' });
  assert.equal(r1.status, 200);

  // agora admin é o único: rebaixar, desativar e desativar a si mesmo são bloqueados
  const rebaixar = await admin.patch(`/usuarios/${idAdmin}/perfil`, { id_perfil: operador, motivo: 'teste' });
  assert.equal(rebaixar.status, 409);
  const desativar = await admin.patch(`/usuarios/${idAdmin}/situacao`, { situacao: 'inativo' });
  assert.equal(desativar.status, 409);

  // devolve o perfil para os próximos testes (concessão exige motivo)
  assert.equal((await admin.patch(`/usuarios/${idAna}/perfil`, { id_perfil: await perfilId('Administrador') })).status, 400);
  assert.equal((await admin.patch(`/usuarios/${idAna}/perfil`, {
    id_perfil: await perfilId('Administrador'), motivo: 'retorno da gestora'
  })).status, 200);
});

test('alterar o perfil encerra as sessões da conta alterada e vale na hora', async () => {
  const admin = await t.entrarAdmin();
  const ana = await t.entrarAdministradora();
  assert.equal((await ana.get('/historico')).status, 200);
  const idAna = await idDe('ana.ribeiro');

  await admin.patch(`/usuarios/${idAna}/perfil`, { id_perfil: await perfilId('Operador'), motivo: 'teste de sessão' });
  assert.equal((await ana.get('/historico')).status, 401);

  const anaDeNovo = await t.entrarAdministradora();
  assert.equal((await anaDeNovo.get('/historico')).status, 403);

  await admin.patch(`/usuarios/${idAna}/perfil`, { id_perfil: await perfilId('Administrador'), motivo: 'retorno' });
});

test('permissões do Operador são configuráveis, sem as exclusivas do Administrador', async () => {
  const admin = await t.entrarAdmin();
  const op = await t.entrarOperador();
  const idOperador = await perfilId('Operador');
  const { corpo } = await admin.get('/perfis');
  const atuais = corpo.perfis.find((p) => p.nome === 'Operador').permissoes;

  const exclusiva = await admin.put(`/perfis/${idOperador}/permissoes`, { permissoes: [...atuais, 'cadastro.excluir'] });
  assert.equal(exclusiva.status, 400);
  const doAdmin = await admin.put(`/perfis/${await perfilId('Administrador')}/permissoes`, { permissoes: [] });
  assert.equal(doAdmin.status, 409);

  // retirar uma permissão vale na próxima requisição, sem novo login
  assert.equal((await op.get('/equipamentos')).status, 200);
  const sem = await admin.put(`/perfis/${idOperador}/permissoes`, { permissoes: atuais.filter((c) => c !== 'cadastro.consultar') });
  assert.equal(sem.status, 200);
  assert.equal((await op.get('/equipamentos')).status, 403);
  await admin.put(`/perfis/${idOperador}/permissoes`, { permissoes: atuais });
  assert.equal((await op.get('/equipamentos')).status, 200);
});

test('conta criada pelo Administrador recebe senha provisória e precisa trocá-la', async () => {
  const admin = await t.entrarAdmin();
  const r = await admin.post('/usuarios', {
    nome: 'Beatriz Nogueira', email: 'beatriz.conta@pristino.org.br', login: 'beatriz.nogueira',
    id_perfil: await perfilId('Operador'), id_colaborador: 6
  });
  assert.equal(r.status, 201);
  const provisoria = r.corpo.senha_provisoria;
  assert.ok(provisoria && provisoria.length >= 12);

  const bia = await t.entrar('beatriz.nogueira', provisoria);
  const bloqueada = await bia.get('/equipamentos');
  assert.equal(bloqueada.status, 403);
  assert.equal(bloqueada.corpo.codigo, 'TROCA_SENHA_OBRIGATORIA');

  const fraca = await bia.put('/conta/senha', { senha_atual: provisoria, senha: 'fraca', confirmacao: 'fraca' });
  assert.equal(fraca.status, 400);
  const troca = await bia.put('/conta/senha', { senha_atual: provisoria, senha: 'Beatriz2026', confirmacao: 'Beatriz2026' });
  assert.equal(troca.status, 200);
  assert.equal((await bia.get('/equipamentos')).status, 200);
});

test('ações administrativas ficam no histórico sem dados secretos', async () => {
  const admin = await t.entrarAdmin();
  const r = await admin.get('/historico?entidade=usuario&por_pagina=100');
  assert.equal(r.status, 200);
  assert.ok(r.corpo.total > 0);
  const tipos = new Set(r.corpo.itens.map((i) => i.tipo));
  for (const tipo of ['aprovacao', 'rejeicao', 'perfil', 'criacao', 'senha']) assert.ok(tipos.has(tipo), tipo);
  assert.doesNotMatch(JSON.stringify(r.corpo), /scrypt\$|senha_hash|senha_provisoria|token/i);
});
