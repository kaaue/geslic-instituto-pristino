// Autocadastro, aprovação, gerenciamento de contas, perfis e permissões (RF_B8, RN21, RN27).

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

test('a matriz de perfis e permissões é explicativa e não editável (RN41, CA24)', async () => {
  const admin = await t.entrarAdmin();
  const op = await t.entrarOperador();
  const { corpo } = await admin.get('/perfis');
  assert.equal(corpo.editavel, false);

  const linha = (texto) => corpo.matriz.find((l) => l.operacao.startsWith(texto));
  // emitir ajuste: só o Operador; o Administrador corrige direto
  assert.deepEqual(linha('Emitir solicitação de ajuste').perfis, {
    Administrador: { permitido: false, observacao: 'corrige diretamente' },
    Operador: { permitido: true, observacao: null }
  });
  assert.equal(linha('Alterar e excluir dados cadastrais').perfis.Operador.observacao, 'solicita ajuste');
  assert.equal(linha('Relatórios').perfis.Operador.permitido, false);
  assert.equal(linha('Contas e perfis').perfis.Administrador.permitido, true);

  // nenhuma operação personaliza as permissões, nem do Operador
  const tentativa = await admin.put(`/perfis/${await perfilId('Operador')}/permissoes`, { permissoes: ['cadastro.excluir'] });
  assert.equal(tentativa.status, 405);
  assert.equal(tentativa.corpo.codigo, 'MATRIZ_NAO_EDITAVEL');
  assert.equal((await op.delete('/fornecedores/1')).status, 403);
  assert.equal((await op.get('/equipamentos')).status, 200);
});

test('contas usam e-mail @pristino.org.br e a aprovação registra quem aprovou (CA23)', async () => {
  const fora = await t.cliente().post('/auth/cadastro', {
    nome: 'Fora do Domínio', email: 'fora@gmail.com', login: 'fora.dominio', senha: 'Senha2026', confirmacao: 'Senha2026'
  });
  assert.equal(fora.status, 400);
  assert.match(fora.corpo.erros.email, /pristino\.org\.br/);

  const admin = await t.entrarAdmin();
  const criar = await admin.post('/usuarios', { nome: 'Conta Externa', email: 'externa@empresa.com', login: 'externa', id_perfil: await perfilId('Operador') });
  assert.equal(criar.status, 400);
  assert.ok(criar.corpo.erros.email);

  // a solicitação pendente do exemplo é aprovada com perfil e colaborador vinculado
  const id = await idDe('luciana.prado');
  const aprovada = await admin.post(`/usuarios/${id}/aprovacao`, { id_perfil: await perfilId('Operador'), id_colaborador: 8 });
  assert.equal(aprovada.status, 200);
  assert.equal(aprovada.corpo.nome_aprovador, 'Administrador do sistema');
  assert.ok(aprovada.corpo.aprovada_em);
  assert.equal(aprovada.corpo.nome_colaborador, 'Luciana Prado');
  assert.equal(aprovada.corpo.ultimo_acesso_em, undefined);
  const [evento] = await t.sql(`SELECT tipo FROM movimentacao WHERE entidade = 'usuario' AND id_registro = ? AND tipo = 'aprovacao'`, [id]);
  assert.ok(evento);
});

test('transferência de privilégios concede e revoga o Administrador numa só operação (RN27)', async () => {
  const admin = await t.entrarAdmin();
  const idCarlos = await idDe('carlos.alves');
  const idAna = await idDe('ana.ribeiro');
  const ana = await t.entrarAdministradora();

  const semMotivo = await admin.post('/usuarios/transferencia-administrador', {
    id_concedida: idCarlos, id_revogada: idAna, destino_revogada: 'operador', data_efetiva: t.dataLocal(0)
  });
  assert.equal(semMotivo.status, 400);
  const invertida = await admin.post('/usuarios/transferencia-administrador', {
    id_concedida: idAna, id_revogada: idCarlos, destino_revogada: 'operador', data_efetiva: t.dataLocal(0), motivo: 'x'
  });
  assert.equal(invertida.status, 400);

  const motivo = 'Troca de gestão aprovada pela diretoria';
  const r = await admin.post('/usuarios/transferencia-administrador', {
    id_concedida: idCarlos, id_revogada: idAna, destino_revogada: 'operador', data_efetiva: t.dataLocal(0), motivo
  });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.concedida.perfil, 'Administrador');
  assert.equal(r.corpo.revogada.perfil, 'Operador');
  // as sessões das contas alteradas são encerradas
  assert.equal((await ana.get('/auth/me')).status, 401);
  const eventos = await t.sql(`SELECT id_registro FROM movimentacao WHERE tipo = 'perfil' AND motivo = ?`, [motivo]);
  assert.deepEqual(eventos.map((e) => e.id_registro).sort(), [idCarlos, idAna].sort());

  // devolve os perfis para os próximos testes
  const volta = await admin.post('/usuarios/transferencia-administrador', {
    id_concedida: idAna, id_revogada: idCarlos, destino_revogada: 'operador', data_efetiva: t.dataLocal(0), motivo: 'Retorno'
  });
  assert.equal(volta.status, 200);
});

test('Minha conta salva dados e senha num único bloco, conferindo a senha atual', async () => {
  const op = await t.entrarOperador();
  const errada = await op.put('/conta', {
    nome: 'Carlos Eduardo Alves', email: 'carlos.alves@pristino.org.br',
    senha_atual: 'errada', senha: 'NovaSenha2026', confirmacao: 'NovaSenha2026'
  });
  assert.equal(errada.status, 400);
  assert.ok(errada.corpo.erros.senha_atual);
  // nada foi gravado: o nome não mudou porque a senha atual não conferiu
  const [antes] = await t.sql(`SELECT nome FROM usuario WHERE login = 'carlos.alves'`);
  assert.equal(antes.nome, 'Carlos Eduardo Alves');

  const ok = await op.put('/conta', {
    nome: 'Carlos E. Alves', email: 'carlos.alves@pristino.org.br',
    senha_atual: t.SENHAS.teste, senha: 'NovaSenha2026', confirmacao: 'NovaSenha2026'
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.corpo.usuario.nome, 'Carlos E. Alves');
  assert.ok((await t.cliente().post('/auth/login', { login: 'carlos.alves', senha: 'NovaSenha2026' })).status === 200);

  // devolve nome e senha para os próximos testes
  const volta = await op.put('/conta', {
    nome: 'Carlos Eduardo Alves', email: 'carlos.alves@pristino.org.br',
    senha_atual: 'NovaSenha2026', senha: t.SENHAS.teste, confirmacao: t.SENHAS.teste
  });
  assert.equal(volta.status, 200);
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
