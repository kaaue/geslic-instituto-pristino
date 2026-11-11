// Colaborador em mais de um setor (colaborador_setor, migração 006), filtro
// de colaboradores pelo projeto, projetos de cada colaborador na listagem e
// a conta de exemplo "operador".

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const t = require('./ajuda');

before(t.iniciar);
after(t.encerrar);
beforeEach(t.zerarLimites);

const setoresNoBanco = async (id) =>
  (await t.sql('SELECT id_setor FROM colaborador_setor WHERE id_colaborador = ? ORDER BY id_setor', [id]))
    .map((l) => l.id_setor);

test('dados de exemplo: quatro setores e colaboradores em mais de um setor', async () => {
  const op = await t.entrarOperador();
  const setores = (await op.get('/setores')).corpo.map((s) => s.nome).sort();
  assert.deepEqual(setores, ['ADMINISTRATIVO', 'CAOMA', 'NUGEO', 'Onça']);
  const lista = (await op.get('/colaboradores')).corpo;
  const juliana = lista.find((c) => c.nome === 'Juliana Moreira');
  assert.equal(juliana.nome_setor, 'CAOMA, Onça');
  assert.deepEqual(juliana.ids_setores, [3, 2]);
  assert.ok(lista.filter((c) => c.ids_setores.length > 1).length >= 3);
  assert.ok(lista.every((c) => c.ids_setores.length >= 1));
});

test('inclusão e correção com vários setores; ao menos um é obrigatório', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();

  assert.equal((await op.post('/colaboradores', { nome: 'Sem Setor Nenhum' })).corpo.erros.ids_setores,
    'Selecione ao menos um setor.');
  assert.equal((await op.post('/colaboradores', { nome: 'Sem Setor Nenhum', ids_setores: [] })).status, 400);
  assert.equal((await op.post('/colaboradores', { nome: 'Setor Que Não Existe', ids_setores: [1, 999] })).status, 400);
  const inativo = await t.setorInativo();
  const comInativo = await op.post('/colaboradores', { nome: 'Setor Inativo Junto', ids_setores: [1, inativo] });
  assert.equal(comInativo.status, 400);
  assert.match(comInativo.corpo.erros.ids_setores, /Educação Ambiental/);

  // o Operador inclui com dois setores (repetidos contam uma vez)
  const novo = await op.post('/colaboradores', {
    nome: 'Lívia Campos', cargo: 'Veterinária', email: 'livia.campos@pristino.org.br', ids_setores: [2, 3, 2]
  });
  assert.equal(novo.status, 201);
  assert.equal(novo.corpo.nome_setor, 'CAOMA, Onça');
  assert.deepEqual(await setoresNoBanco(novo.corpo.id_colaborador), [2, 3]);
  const id = novo.corpo.id_colaborador;

  // corrigir os setores é do Administrador (o Operador pede por solicitação de ajuste)
  assert.equal((await op.put(`/colaboradores/${id}`, { ...novo.corpo, ids_setores: [1] })).status, 403);
  const corrigido = await admin.put(`/colaboradores/${id}`, { ...novo.corpo, ids_setores: [1, 2, 4] });
  assert.equal(corrigido.status, 200);
  assert.equal(corrigido.corpo.nome_setor, 'ADMINISTRATIVO, NUGEO, Onça');
  assert.deepEqual(await setoresNoBanco(id), [1, 2, 4]);
  assert.equal((await admin.put(`/colaboradores/${id}`, { ...novo.corpo, ids_setores: [] })).status, 400);
  assert.deepEqual(await setoresNoBanco(id), [1, 2, 4]);

  // o histórico guarda os setores antes e depois
  const [evento] = await t.sql(
    `SELECT dados_anteriores, dados_posteriores FROM movimentacao
      WHERE entidade = 'colaborador' AND id_registro = ? AND tipo = 'correcao'`, [id]);
  const ler = (v) => (typeof v === 'string' ? JSON.parse(v) : v);
  assert.deepEqual(ler(evento.dados_anteriores).ids_setores, [2, 3]);
  assert.deepEqual(ler(evento.dados_posteriores).ids_setores, [1, 2, 4]);

  // o antigo id_setor (um só) continua aceito
  const umSetor = await op.post('/colaboradores', { nome: 'Rui Teixeira', id_setor: 4 });
  assert.equal(umSetor.status, 201);
  assert.deepEqual(umSetor.corpo.ids_setores, [4]);
});

test('um setor inativo já vinculado pode continuar na correção, mas não entra como novo', async () => {
  const admin = await t.entrarAdmin();
  const inativo = await t.setorInativo();
  await t.sql('INSERT INTO colaborador_setor (id_colaborador, id_setor) VALUES (7, ?)', [inativo]);
  const tiago = (await admin.get('/colaboradores/7')).corpo;
  assert.ok(tiago.ids_setores.includes(inativo));
  assert.equal((await admin.put('/colaboradores/7', { ...tiago, cargo: 'Designer gráfico' })).status, 200);
  assert.equal((await admin.put('/colaboradores/6', { ...(await admin.get('/colaboradores/6')).corpo, ids_setores: [3, inativo] })).status, 400);
  await t.sql('DELETE FROM colaborador_setor WHERE id_colaborador = 7 AND id_setor = ?', [inativo]);
});

test('filtro por setor: o colaborador aparece em cada um dos seus setores', async () => {
  const op = await t.entrarOperador();
  const nomes = async (idSetor) => (await op.get(`/colaboradores?id_setor=${idSetor}`)).corpo.map((c) => c.nome);
  const nugeo = await nomes(1);
  const onca = await nomes(2);
  assert.ok(nugeo.includes('Pedro Henrique Matos') && onca.includes('Pedro Henrique Matos'));
  assert.ok(nugeo.includes('Carlos Eduardo Alves') && (await nomes(4)).includes('Carlos Eduardo Alves'));
  assert.ok(!onca.includes('Carlos Eduardo Alves'));
  // a contagem do setor inclui quem também está em outro setor (só os ativos)
  const setores = (await op.get('/setores')).corpo;
  assert.equal(setores.find((s) => s.nome === 'Onça').colaboradores, onca.length - 1); // Rafael Antunes está desligado
});

test('lista de ativos traz os setores, para o RN43 e o seletor "nome — setor"', async () => {
  const op = await t.entrarOperador();
  const ativos = (await op.get('/colaboradores/ativos')).corpo;
  const pedro = ativos.find((c) => c.nome === 'Pedro Henrique Matos');
  assert.deepEqual(pedro.ids_setores, [1, 2]);
  assert.equal(pedro.nome_setor, 'NUGEO, Onça');
  assert.ok(!ativos.some((c) => c.nome === 'Rafael Antunes'));
  // participantes de projeto e solicitações de ajuste mostram todos os setores
  const [{ id_projeto: id }] = await t.sql(`SELECT id_projeto FROM projeto WHERE codigo = '2041'`);
  const projeto = (await op.get(`/projetos/${id}`)).corpo;
  assert.equal(projeto.lista_participantes.find((c) => c.nome === 'Pedro Henrique Matos').nome_setor, 'NUGEO, Onça');
  const opcoes = (await op.get('/solicitacoes-ajuste/opcoes?entidade=colaborador')).corpo;
  assert.ok(opcoes.some((o) => o.rotulo === 'Juliana Moreira · CAOMA, Onça'));
});

test('filtro por projeto (nome ou código) e projetos de cada colaborador na listagem', async () => {
  const op = await t.entrarOperador();
  const nomes = async (termo) =>
    (await op.get(`/colaboradores?projeto=${encodeURIComponent(termo)}`)).corpo.map((c) => c.nome).sort();

  assert.deepEqual(await nomes('NUGEO'),
    ['Camila Duarte Rocha', 'Carlos Eduardo Alves', 'Juliana Moreira', 'Pedro Henrique Matos']);
  assert.deepEqual(await nomes('2041'), await nomes('NUGEO'));
  assert.deepEqual(await nomes('rio paraná'), ['Juliana Moreira', 'Pedro Henrique Matos', 'Rafael Souza Pinto']);
  assert.deepEqual(await nomes('projeto que não existe'), []);
  // combina com os outros filtros
  const doCaomaNoNugeo = (await op.get('/colaboradores?projeto=NUGEO&id_setor=3')).corpo.map((c) => c.nome);
  assert.deepEqual(doCaomaNoNugeo, ['Juliana Moreira']);

  // cada linha traz os projetos (código, nome e situação), sem o número de projetos
  const juliana = (await op.get('/colaboradores?busca=Juliana')).corpo[0];
  assert.deepEqual(juliana.participacoes.map((p) => p.codigo), ['1022', '1023', '1301', '2041']);
  assert.deepEqual(Object.keys(juliana.participacoes[0]).sort(), ['codigo', 'id_projeto', 'nome', 'situacao']);
  assert.equal(juliana.participacoes.find((p) => p.codigo === '1022').situacao, 'encerrado');
  const semProjeto = (await op.get('/colaboradores?busca=Luciana')).corpo[0];
  assert.deepEqual(semProjeto.participacoes, []);
});

test('correção do colaborador altera os projetos de que participa; responsável não sai e desligado não entra', async () => {
  const admin = await t.entrarAdmin();
  const op = await t.entrarOperador();
  const projetos = (await admin.get('/projetos')).corpo;
  const id = (codigo) => projetos.find((p) => p.codigo === codigo).id_projeto;
  const codigos = async (idColaborador) =>
    (await admin.get(`/colaboradores/${idColaborador}`)).corpo.participacoes.map((p) => p.codigo);

  // Tiago (7) participa só do 1450; sem ids_projetos, nada muda
  const tiago = (await admin.get('/colaboradores/7')).corpo;
  assert.deepEqual(await codigos(7), ['1450']);
  assert.equal((await admin.put('/colaboradores/7', { ...tiago, cargo: tiago.cargo })).status, 200);
  assert.deepEqual(await codigos(7), ['1450']);

  // entra no 2041 e no 1022 (encerrado) e sai do 1450, se não for o responsável dele
  const responsavelDo1450 = projetos.find((p) => p.codigo === '1450').id_responsavel === 7;
  const novos = [id('2041'), id('1022'), ...(responsavelDo1450 ? [id('1450')] : [])];
  const alterado = await admin.put('/colaboradores/7', { ...tiago, ids_projetos: [...novos, id('2041')] });
  assert.equal(alterado.status, 200);
  assert.deepEqual(await codigos(7), responsavelDo1450 ? ['1022', '1450', '2041'] : ['1022', '2041']);
  // o projeto mostra o novo participante e guarda o evento no histórico
  const p2041 = (await admin.get(`/projetos/${id('2041')}`)).corpo;
  assert.ok(p2041.lista_participantes.some((c) => c.id_colaborador === 7));
  const eventos = await t.sql(
    `SELECT descricao FROM movimentacao WHERE entidade = 'projeto' AND id_registro = ? AND descricao LIKE '%cadastro do colaborador%'`,
    [id('2041')]);
  assert.equal(eventos.length, 1);
  assert.match(eventos[0].descricao, /incluído entre os participantes/);

  // inválidos: projeto inexistente e formato errado não mudam nada
  assert.equal((await admin.put('/colaboradores/7', { ...tiago, ids_projetos: [999999] })).status, 400);
  assert.equal((await admin.put('/colaboradores/7', { ...tiago, ids_projetos: 'x' })).corpo.erros.ids_projetos, 'Projetos inválidos.');
  assert.ok((await codigos(7)).includes('2041'));

  // o responsável não sai do próprio projeto
  const comResponsavel = projetos.find((p) => p.id_responsavel);
  const responsavel = (await admin.get(`/colaboradores/${comResponsavel.id_responsavel}`)).corpo;
  const recusa = await admin.put(`/colaboradores/${responsavel.id_colaborador}`, { ...responsavel, ids_projetos: [] });
  assert.equal(recusa.status, 400);
  assert.match(recusa.corpo.erros.ids_projetos, /é responsável por/);
  assert.deepEqual(await codigos(responsavel.id_colaborador), responsavel.participacoes.map((p) => p.codigo));

  // desligado: pode sair, não entra em outro projeto
  const desligado = (await admin.get('/colaboradores')).corpo.find((c) => !c.ativo);
  const atuais = desligado.participacoes.map((p) => p.id_projeto);
  const outro = projetos.find((p) => !atuais.includes(p.id_projeto)).id_projeto;
  const entrada = await admin.put(`/colaboradores/${desligado.id_colaborador}`, { ...desligado, ids_projetos: [...atuais, outro] });
  assert.equal(entrada.status, 400);
  assert.match(entrada.corpo.erros.ids_projetos, /desligado/);

  // o Operador não corrige (pede por solicitação de ajuste)
  assert.equal((await op.put('/colaboradores/7', { ...tiago, ids_projetos: [] })).status, 403);
});

test('solicitação de acesso: um setor no pedido; na aprovação, um ou mais setores', async () => {
  const admin = await t.entrarAdmin();
  const pedidos = (await admin.get('/usuarios?situacao=pendente')).corpo;
  assert.deepEqual(pedidos.map((p) => p.login).sort(), ['fernanda.vieira', 'gustavo.sales', 'luciana.prado']);
  const gustavo = pedidos.find((p) => p.login === 'gustavo.sales');
  assert.equal(gustavo.nome_setor_solicitado, 'NUGEO');
  assert.equal(gustavo.cadastro_cargo, 'Estagiário de geoprocessamento');
  // filtro por setor encontra o pedido pelo setor informado
  assert.ok((await admin.get('/usuarios?id_setor=1')).corpo.some((c) => c.login === 'gustavo.sales'));

  const [{ id_perfil: operador }] = await t.sql(`SELECT id_perfil FROM perfil WHERE nome = 'Operador'`);
  const inativo = await t.setorInativo();
  const recusada = await admin.post(`/usuarios/${gustavo.id_usuario}/aprovacao`, {
    id_perfil: operador, colaborador_novo: { ids_setores: [1, inativo] }
  });
  assert.equal(recusada.status, 400);
  assert.ok(recusada.corpo.erros.colaborador_ids_setores);
  const aprovada = await admin.post(`/usuarios/${gustavo.id_usuario}/aprovacao`, {
    id_perfil: operador, colaborador_novo: { ids_setores: [1, 2], cargo: 'Estagiário de geoprocessamento' }
  });
  assert.equal(aprovada.status, 200);
  assert.equal(aprovada.corpo.nome_setor, 'NUGEO, Onça');
  assert.equal(aprovada.corpo.cargo_colaborador, 'Estagiário de geoprocessamento');
  assert.deepEqual(await setoresNoBanco(aprovada.corpo.id_colaborador), [1, 2]);
});

test('conta de exemplo "operador": perfil Operador, ligada a um colaborador, senha geslic123', async () => {
  const op = await t.entrar('operador', 'geslic123');
  const eu = (await op.get('/auth/me')).corpo;
  const conta = eu.usuario || eu;
  assert.equal(conta.perfil, 'Operador');
  assert.equal(conta.nome_colaborador, 'Pedro Henrique Matos');
  assert.equal(conta.nome_setor, 'NUGEO, Onça');
  // permissões do Operador: inclui, não corrige nem gerencia contas
  assert.equal((await op.post('/colaboradores', { nome: 'Incluído Pelo Operador', ids_setores: [1, 3] })).status, 201);
  assert.equal((await op.put('/colaboradores/5', { nome: 'Rafael Souza Pinto', ids_setores: [2, 3] })).status, 403);
  assert.equal((await op.get('/usuarios')).status, 403);
  // emite solicitação de ajuste (RF_B10); os exemplos já trazem as dele
  const painel = (await op.get('/solicitacoes-ajuste/painel')).corpo;
  assert.ok(painel.pendentes.total >= 4);
  assert.ok(painel.concluidas.some((s) => s.rotulo_registro === 'NUGEO'));
});

test('solicitações de ajuste de exemplo: pendentes e concluídas, em cadastros variados', async () => {
  const linhas = await t.sql('SELECT entidade, situacao, id_concluinte FROM solicitacao_ajuste');
  assert.ok(new Set(linhas.map((l) => l.entidade)).size >= 6);
  assert.ok(linhas.some((l) => l.situacao === 'pendente'));
  assert.ok(linhas.filter((l) => l.situacao === 'concluida').every((l) => l.id_concluinte));
  // o rótulo gravado é o mesmo da lista de escolha da tela
  const op = await t.entrarOperador();
  for (const s of await t.sql('SELECT entidade, id_registro, rotulo_registro FROM solicitacao_ajuste')) {
    const opcoes = (await op.get(`/solicitacoes-ajuste/opcoes?entidade=${s.entidade}`)).corpo;
    assert.equal(opcoes.find((o) => o.id === s.id_registro)?.rotulo, s.rotulo_registro, `${s.entidade} ${s.id_registro}`);
  }
});
