// Lote de revisões funcionais: participantes e responsável do projeto,
// filtro por setor, encerramento e reabertura, ausência de exclusão física,
// conta criada junto com o colaborador, solicitação de acesso com setor,
// senha provisória com prazo, transferência de privilégios e diferenças
// entre os perfis Administrador e Operador.

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const t = require('./ajuda');

before(t.iniciar);
after(t.encerrar);
beforeEach(t.zerarLimites);

const perfilId = async (nome) => (await t.sql('SELECT id_perfil FROM perfil WHERE nome = ?', [nome]))[0].id_perfil;
const participantes = async (idProjeto) =>
  (await t.sql('SELECT id_colaborador FROM colaborador_projeto WHERE id_projeto = ? ORDER BY 1', [idProjeto]))
    .map((l) => l.id_colaborador);

const PROJETO = {
  codigo: '3100', nome: 'Projeto das revisões', fonte_financiadora: 'Teste',
  data_inicio: '2026-01-01', data_fim_prevista: '2027-12-31'
};

test('responsável entra automaticamente nos participantes, sem duplicar, na criação e na edição', async () => {
  const admin = await t.entrarAdmin();
  const criado = await admin.post('/projetos', { ...PROJETO, id_responsavel: 4, participantes: [6, 6] });
  assert.equal(criado.status, 201);
  const id = criado.corpo.id_projeto;
  assert.deepEqual(await participantes(id), [4, 6]);

  // trocar o responsável inclui o novo e não retira o anterior
  const r = await admin.put(`/projetos/${id}`, { ...PROJETO, id_responsavel: 5, participantes: [4, 6] });
  assert.equal(r.status, 200);
  assert.deepEqual(await participantes(id), [4, 5, 6]);

  // sem a lista de participantes, a edição mantém os atuais e garante o responsável
  await admin.put(`/projetos/${id}`, { ...PROJETO, id_responsavel: 7 });
  assert.deepEqual(await participantes(id), [4, 5, 6, 7]);
});

test('participação é a seleção do momento: mudar o colaborador de setor não o tira do projeto', async () => {
  const admin = await t.entrarAdmin();
  const [{ id_projeto: id }] = await t.sql(`SELECT id_projeto FROM projeto WHERE codigo = '3100'`);
  const colaborador = (await admin.get('/colaboradores/6')).corpo;
  const movido = await admin.put('/colaboradores/6', { ...colaborador, id_setor: 5 });
  assert.equal(movido.status, 200);
  assert.ok((await participantes(id)).includes(6));
});

test('filtro de projetos por setor considera o responsável e os participantes', async () => {
  const op = await t.entrarOperador();
  // 1301: responsável Rafael Souza Pinto, do setor 4
  const setor4 = (await op.get('/projetos?id_setor=4')).corpo.map((p) => p.codigo);
  assert.ok(setor4.includes('1301'));
  // 1023: responsável do setor 1, participante (Juliana) do setor 3
  const setor3 = (await op.get('/projetos?id_setor=3')).corpo.map((p) => p.codigo);
  assert.ok(setor3.includes('1023'));
  assert.ok(!setor3.includes('0007'));
  // ano: inclui projeto iniciado antes do ano escolhido
  const em2026 = (await op.get('/projetos?ano=2026')).corpo.map((p) => p.codigo);
  assert.ok(em2026.includes('0007') && em2026.includes('1023'));
});

test('encerrar e reabrir: o Operador pode, as datas não mudam e os dois eventos ficam no histórico', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();
  const [{ id_projeto: id }] = await t.sql(`SELECT id_projeto FROM projeto WHERE codigo = '3100'`);

  assert.equal((await op.post(`/projetos/${id}/reabertura`, { motivo: 'teste' })).status, 409);
  assert.equal((await op.post(`/projetos/${id}/encerramento`, { data_encerramento: t.dataLocal(-1) })).status, 200);
  const semMotivo = await op.post(`/projetos/${id}/reabertura`, {});
  assert.equal(semMotivo.status, 400);
  assert.ok(semMotivo.corpo.erros.motivo);

  const reaberto = await op.post(`/projetos/${id}/reabertura`, { motivo: 'Encerrado por engano' });
  assert.equal(reaberto.status, 200);
  assert.equal(reaberto.corpo.situacao, 'em_andamento');
  const [projeto] = await t.sql(
    `SELECT situacao, data_encerramento, DATE_FORMAT(data_inicio, '%Y-%m-%d') AS inicio,
            DATE_FORMAT(data_fim_prevista, '%Y-%m-%d') AS fim FROM projeto WHERE id_projeto = ?`, [id]);
  assert.deepEqual({ ...projeto }, { situacao: 'em_andamento', data_encerramento: null, inicio: '2026-01-01', fim: '2027-12-31' });

  const historico = (await admin.get(`/historico?entidade=projeto&id_registro=${id}`)).corpo.itens;
  const tipos = historico.map((h) => h.tipo);
  assert.ok(tipos.includes('encerramento') && tipos.includes('reabertura'));
  const reabertura = historico.find((h) => h.tipo === 'reabertura');
  assert.equal(reabertura.login_responsavel, 'carlos.alves');
  assert.equal(reabertura.motivo, 'Encerrado por engano');
  const antes = typeof reabertura.dados_anteriores === 'string' ? JSON.parse(reabertura.dados_anteriores) : reabertura.dados_anteriores;
  assert.equal(antes.situacao, 'encerrado');
  assert.ok(historico.every((h) => h.id_registro === id));
});

test('reabrir projeto com término vencido avisa, sem alterar a data', async () => {
  const op = await t.entrarOperador();
  // 1022 está encerrado e terminou em 2025
  const [{ id_projeto: id }] = await t.sql(`SELECT id_projeto FROM projeto WHERE codigo = '1022'`);
  const r = await op.post(`/projetos/${id}/reabertura`, { motivo: 'Execução retomada' });
  assert.equal(r.status, 200);
  assert.ok(r.corpo.avisos.some((a) => /término previsto já passou/.test(a)));
  const [{ fim }] = await t.sql(`SELECT DATE_FORMAT(data_fim_prevista, '%Y-%m-%d') AS fim FROM projeto WHERE id_projeto = ?`, [id]);
  assert.equal(fim, '2025-12-31');
});

test('nenhum cadastro é excluído pela API: 405 para todos os perfis, vínculos preservados', async () => {
  const admin = await t.entrarAdmin();
  const op = await t.entrarOperador();
  for (const caminho of ['/projetos/1', '/colaboradores/4', '/equipamentos/1', '/softwares/1',
    '/fornecedores/1', '/setores/1', '/bens-seguraveis/1', '/tipos-seguro/1', '/licencas/1', '/apolices/1']) {
    const r = await admin.delete(caminho);
    assert.equal(r.status, 405, caminho);
    assert.equal(r.corpo.codigo, 'EXCLUSAO_INDISPONIVEL');
    assert.equal((await op.delete(caminho)).status, 405, caminho);
  }
  const [{ total }] = await t.sql('SELECT COUNT(*) AS total FROM colaborador_projeto WHERE id_projeto = 1');
  assert.ok(total >= 1);
});

test('conta criada junto com um colaborador novo, numa única operação', async () => {
  const admin = await t.entrarAdmin();
  const dados = {
    nome: 'Helena Duarte', email: 'helena.duarte@pristino.org.br', login: 'helena.duarte',
    id_perfil: await perfilId('Operador'),
    colaborador_novo: { id_setor: 3, cargo: 'Bióloga' }
  };
  // sem colaborador, a conta não é criada
  const sem = await admin.post('/usuarios', { ...dados, colaborador_novo: undefined });
  assert.equal(sem.status, 400);
  assert.ok(sem.corpo.erros.id_colaborador);

  const r = await admin.post('/usuarios', dados);
  assert.equal(r.status, 201);
  assert.equal(r.corpo.conta.nome_colaborador, 'Helena Duarte');
  assert.ok(r.corpo.senha_expira_em);
  const [colab] = await t.sql(`SELECT id_colaborador, email, id_setor, cargo FROM colaborador WHERE nome = 'Helena Duarte'`);
  assert.equal(colab.email, 'helena.duarte@pristino.org.br');
  assert.equal(colab.id_setor, 3);
  assert.equal(r.corpo.conta.id_colaborador, colab.id_colaborador);

  // login repetido: nada é gravado, nem o colaborador
  const repetido = await admin.post('/usuarios', {
    ...dados, nome: 'Outra Pessoa', email: 'outra.pessoa@pristino.org.br', colaborador_novo: { nome: 'Outra Pessoa', id_setor: 2 }
  });
  assert.equal(repetido.status, 400);
  assert.equal((await t.sql(`SELECT COUNT(*) AS n FROM colaborador WHERE nome = 'Outra Pessoa'`))[0].n, 0);
});

test('homônimo: a API mostra os cadastros existentes e só cria outro com confirmação', async () => {
  const admin = await t.entrarAdmin();
  const dados = {
    nome: 'Tiago Fernandes', email: 'tiago.f2@pristino.org.br', login: 'tiago.f2',
    id_perfil: await perfilId('Operador'), colaborador_novo: { id_setor: 4 }
  };
  const r = await admin.post('/usuarios', dados);
  assert.equal(r.status, 409);
  assert.equal(r.corpo.codigo, 'COLABORADOR_HOMONIMO');
  assert.equal(r.corpo.homonimos[0].nome_setor, 'Comunicação');
  assert.equal((await t.sql(`SELECT COUNT(*) AS n FROM usuario WHERE login = 'tiago.f2'`))[0].n, 0);

  const confirmado = await admin.post('/usuarios', { ...dados, confirmar_homonimo: true });
  assert.equal(confirmado.status, 201);
  assert.equal((await t.sql(`SELECT COUNT(*) AS n FROM colaborador WHERE nome = 'Tiago Fernandes'`))[0].n, 2);
});

test('solicitação de acesso guarda setor e cargo; o colaborador só nasce na aprovação', async () => {
  const publico = t.cliente();
  const setores = await publico.get('/auth/setores');
  assert.equal(setores.status, 200);
  assert.ok(setores.corpo.every((s) => Object.keys(s).sort().join() === 'id_setor,nome'));
  assert.ok(!setores.corpo.some((s) => s.nome === 'Educação Ambiental'));

  const base = { nome: 'Otávio Reis', email: 'otavio.reis@pristino.org.br', login: 'otavio.reis', senha: 'Otavio2026', confirmacao: 'Otavio2026' };
  const semSetor = await publico.post('/auth/cadastro', base);
  assert.equal(semSetor.status, 400);
  assert.ok(semSetor.corpo.erros.id_setor);
  assert.equal((await publico.post('/auth/cadastro', { ...base, id_setor: 4, cargo: 'Técnico de campo' })).status, 201);
  assert.equal((await t.sql(`SELECT COUNT(*) AS n FROM colaborador WHERE nome = 'Otávio Reis'`))[0].n, 0);

  const admin = await t.entrarAdmin();
  const [{ id_usuario: id }] = await t.sql(`SELECT id_usuario FROM usuario WHERE login = 'otavio.reis'`);
  const pedido = (await admin.get('/usuarios?situacao=pendente')).corpo.find((c) => c.id_usuario === id);
  assert.equal(pedido.nome_setor_solicitado, 'Campo e Monitoramento');
  assert.equal(pedido.cadastro_cargo, 'Técnico de campo');

  // aprovação comum: sem motivo
  const aprovada = await admin.post(`/usuarios/${id}/aprovacao`, {
    id_perfil: await perfilId('Operador'), colaborador_novo: { id_setor: 4, cargo: 'Técnico de campo' }
  });
  assert.equal(aprovada.status, 200);
  assert.equal(aprovada.corpo.situacao, 'ativo');
  assert.equal(aprovada.corpo.nome_colaborador, 'Otávio Reis');
  assert.equal(aprovada.corpo.nome_aprovador, 'Administrador do sistema');
  const [evento] = await t.sql(`SELECT descricao FROM movimentacao WHERE entidade = 'usuario' AND id_registro = ? AND tipo = 'aprovacao'`, [id]);
  assert.match(evento.descricao, /cadastrado na aprovação/);
  // filtro por setor
  const doSetor = (await admin.get('/usuarios?id_setor=4')).corpo.map((c) => c.login);
  assert.ok(doSetor.includes('otavio.reis'));
  assert.ok(!doSetor.includes('carlos.alves'));
});

test('aprovação reaproveita colaborador existente e recusa duplicar por e-mail', async () => {
  const admin = await t.entrarAdmin();
  const [{ id_usuario: id }] = await t.sql(`SELECT id_usuario FROM usuario WHERE login = 'luciana.prado'`);
  // já existe a colaboradora Luciana Prado com o mesmo e-mail
  const duplicar = await admin.post(`/usuarios/${id}/aprovacao`, { id_perfil: await perfilId('Operador'), colaborador_novo: { id_setor: 1 } });
  assert.equal(duplicar.status, 400);
  assert.match(duplicar.corpo.erros.id_colaborador, /selecione-o/);
  const [{ id_colaborador: idColab }] = await t.sql(`SELECT id_colaborador FROM colaborador WHERE email = 'luciana.prado@pristino.org.br'`);
  const ok = await admin.post(`/usuarios/${id}/aprovacao`, { id_perfil: await perfilId('Operador'), id_colaborador: idColab });
  assert.equal(ok.status, 200);
  assert.equal(ok.corpo.id_colaborador, idColab);
});

test('senha provisória: só o hash é gravado, nada vai para o histórico, e vencida não entra', async () => {
  const admin = await t.entrarAdmin();
  const [{ id_usuario: id }] = await t.sql(`SELECT id_usuario FROM usuario WHERE login = 'otavio.reis'`);
  const r = await admin.post(`/usuarios/${id}/senha-provisoria`);
  assert.equal(r.status, 200);
  const senha = r.corpo.senha_provisoria;
  assert.ok(senha.length >= 12 && r.corpo.senha_expira_em);
  const [conta] = await t.sql('SELECT senha_hash, troca_senha_obrigatoria FROM usuario WHERE id_usuario = ?', [id]);
  assert.notEqual(conta.senha_hash, senha);
  assert.ok(!conta.senha_hash.includes(senha));
  assert.equal(conta.troca_senha_obrigatoria, 1);
  const eventos = await t.sql(`SELECT CONCAT_WS(' ', descricao, motivo, dados_anteriores, dados_posteriores) AS texto
                                 FROM movimentacao WHERE entidade = 'usuario' AND id_registro = ?`, [id]);
  assert.ok(eventos.every((e) => !String(e.texto).includes(senha)));

  // dentro do prazo, entra (e precisa trocar); vencida, é recusada
  const dentro = await t.cliente().post('/auth/login', { login: 'otavio.reis', senha });
  assert.equal(dentro.status, 200);
  await t.sql('UPDATE usuario SET senha_provisoria_expira_em = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE id_usuario = ?', [id]);
  const vencida = await t.cliente().post('/auth/login', { login: 'otavio.reis', senha });
  assert.equal(vencida.status, 403);
  assert.equal(vencida.corpo.codigo, 'SENHA_PROVISORIA_EXPIRADA');
});

test('transferência de privilégios: só o Administrador; dados inválidos não mudam nenhuma conta', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();
  const [{ id_usuario: carlos }] = await t.sql(`SELECT id_usuario FROM usuario WHERE login = 'carlos.alves'`);
  const [{ id_usuario: ana }] = await t.sql(`SELECT id_usuario FROM usuario WHERE login = 'ana.ribeiro'`);
  const pedido = { id_concedida: carlos, id_revogada: ana, destino_revogada: 'operador', motivo: 'Troca de gestão', data_efetiva: t.dataLocal() };
  assert.equal((await op.post('/usuarios/transferencia-administrador', pedido)).status, 403);

  // conta de destino desativada: recusa, e as duas contas ficam como estavam
  await admin.patch(`/usuarios/${carlos}/situacao`, { situacao: 'inativo' });
  const recusada = await admin.post('/usuarios/transferencia-administrador', pedido);
  assert.equal(recusada.status, 400);
  const perfis = await t.sql(`SELECT login, p.nome AS perfil FROM usuario u JOIN perfil p USING (id_perfil) WHERE login IN ('carlos.alves', 'ana.ribeiro') ORDER BY login`);
  assert.deepEqual(perfis.map((p) => `${p.login}:${p.perfil}`), ['ana.ribeiro:Administrador', 'carlos.alves:Operador']);

  await admin.patch(`/usuarios/${carlos}/situacao`, { situacao: 'ativo' });
  const feita = await admin.post('/usuarios/transferencia-administrador', pedido);
  assert.equal(feita.status, 200);
  assert.equal(feita.corpo.concedida.perfil, 'Administrador');
  assert.equal(feita.corpo.revogada.perfil, 'Operador');
  assert.equal(feita.corpo.revogada.situacao, 'ativo');
  const [evento] = await t.sql(`SELECT descricao FROM movimentacao WHERE entidade = 'usuario' AND id_registro = ? ORDER BY id_movimentacao DESC LIMIT 1`, [ana]);
  assert.match(evento.descricao, /passa a Operador e continua ativa/);
});

test('Operador: páginas autorizadas abrem, as administrativas são bloqueadas no backend', async () => {
  const op = await t.entrar('ana.ribeiro', t.SENHAS.teste); // ana virou Operador no teste anterior
  const [{ perfil }] = await t.sql(`SELECT p.nome AS perfil FROM usuario u JOIN perfil p USING (id_perfil) WHERE login = 'ana.ribeiro'`);
  assert.equal(perfil, 'Operador');
  for (const caminho of ['/projetos', '/colaboradores', '/equipamentos', '/softwares', '/fornecedores', '/setores', '/solicitacoes-ajuste/painel']) {
    assert.equal((await op.get(caminho)).status, 200, caminho);
  }
  for (const caminho of ['/usuarios', '/perfis', '/historico']) {
    assert.equal((await op.get(caminho)).status, 403, caminho);
  }
  assert.equal((await op.post('/usuarios', { nome: 'X' })).status, 403);
  assert.equal((await op.put('/projetos/1', { ...PROJETO, id_responsavel: 1 })).status, 403);
  const me = (await op.get('/auth/me')).corpo.usuario;
  assert.ok(!me.permissoes.includes('usuario.gerenciar') && !me.permissoes.includes('auditoria.consultar'));
});
