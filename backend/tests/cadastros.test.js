// Funções básicas de cadastro (RF_B1 a RF_B7): permissões por perfil (RN21),
// datas efetivas (RN37, CA17), exclusão só sem vínculos (RN22, CA11),
// homônimos e e-mail único (RN19), campos por categoria do bem (RN20) e
// bens relacionados a projetos pelas apólices (RN40, CA18).

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const t = require('./ajuda');

before(t.iniciar);
after(t.encerrar);
beforeEach(t.zerarLimites);

const ontem = () => t.dataLocal(-1);

test('RF_B1: CNPJ obrigatório e único; Operador inclui e inativa, só o Administrador corrige e exclui', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();

  const invalido = await op.post('/fornecedores', { tipo: 'software', razao_social: 'Sem CNPJ Ltda.', cnpj: '123' });
  assert.equal(invalido.status, 400);
  assert.ok(invalido.corpo.erros.cnpj);
  const repetido = await op.post('/fornecedores', { tipo: 'software', razao_social: 'Outra Ltda.', cnpj: '00.111.222/0001-01' });
  assert.equal(repetido.status, 400);
  assert.match(repetido.corpo.erros.cnpj, /já está cadastrado/);

  const novo = await op.post('/fornecedores', {
    tipo: 'seguradora', razao_social: 'Atlântica Seguros S.A.', nome_fantasia: 'Atlântica', cnpj: '12.345.678/0001-90',
    telefone: '(31) 3222-0000', email: 'Corretor@Atlantica.example'
  });
  assert.equal(novo.status, 201);
  assert.equal(novo.corpo.cnpj, '12345678000190');
  assert.equal(novo.corpo.email, 'corretor@atlantica.example');
  const id = novo.corpo.id_fornecedor;

  assert.equal((await op.put(`/fornecedores/${id}`, { ...novo.corpo, razao_social: 'Outra' })).status, 403);
  assert.equal((await op.delete(`/fornecedores/${id}`)).status, 403);
  assert.equal((await op.post(`/fornecedores/${id}/inativacao`, {})).status, 400);
  const inativo = await op.post(`/fornecedores/${id}/inativacao`, { data_efetiva: ontem(), motivo: 'Contrato encerrado' });
  assert.equal(inativo.status, 200);
  assert.equal(inativo.corpo.ativo, false);
  assert.equal((await op.post(`/fornecedores/${id}/reativacao`)).status, 403);
  assert.equal((await admin.post(`/fornecedores/${id}/reativacao`)).status, 200);

  // sem vínculos, o Administrador exclui
  assert.equal((await admin.delete(`/fornecedores/${id}`)).status, 200);
});

test('RF_B1: fornecedor com licenças não exclui nem vira seguradora (RN22, CA11)', async () => {
  const admin = await t.entrarAdmin();
  const atual = (await admin.get('/fornecedores/1')).corpo;
  assert.ok(atual.licencas >= 1);
  const excluir = await admin.delete('/fornecedores/1');
  assert.equal(excluir.status, 409);
  assert.equal(excluir.corpo.codigo, 'CADASTRO_COM_VINCULOS');
  assert.match(excluir.corpo.mensagem, /licenç/);
  const virar = await admin.put('/fornecedores/1', { ...atual, tipo: 'seguradora' });
  assert.equal(virar.status, 400);
  assert.ok(virar.corpo.erros.tipo);
});

test('RF_B2: software com licença não é excluído; nome e versão não se repetem; categorias sugeridas', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();
  const lista = (await op.get('/softwares')).corpo;
  const arcgis = lista.find((s) => s.nome === 'ArcGIS Desktop');
  assert.equal(arcgis.licencas, 1);
  assert.equal(arcgis.codigos_licencas, 'LIC-0002');

  const repetido = await op.post('/softwares', { nome: 'arcgis  desktop', versao: '10.8', fabricante: 'Esri' });
  assert.equal(repetido.status, 400);
  assert.ok(repetido.corpo.erros.nome);
  assert.equal((await op.post('/softwares', { nome: 'ArcGIS Desktop', versao: '11.0', fabricante: 'Esri' })).status, 201);

  const excluir = await admin.delete(`/softwares/${arcgis.id_software}`);
  assert.equal(excluir.status, 409);
  assert.match(excluir.corpo.mensagem, /inative/);

  // a correção do nome acompanha nas licenças (coluna legada nome_software)
  const corrigido = await admin.put(`/softwares/${arcgis.id_software}`, { ...arcgis, nome: 'ArcGIS Pro Standard' });
  assert.equal(corrigido.status, 200);
  const [licenca] = await t.sql(`SELECT nome_software FROM licenca WHERE codigo = 'LIC-0002'`);
  assert.equal(licenca.nome_software, 'ArcGIS Pro Standard');

  assert.ok((await op.get('/softwares/categorias')).corpo.includes('Geoprocessamento'));
});

test('RF_B4: homônimo é avisado e permitido; e-mail repetido é bloqueado (RN19)', async () => {
  const op = await t.entrarOperador();
  const homonimos = await op.get(`/colaboradores/homonimos?nome=${encodeURIComponent('juliana  moreira')}`);
  assert.equal(homonimos.status, 200);
  assert.equal(homonimos.corpo.length, 1);
  assert.equal(homonimos.corpo[0].nome_setor, 'Projetos Ambientais');

  const repetido = await op.post('/colaboradores', { nome: 'Juliana Moreira', id_setor: 4, email: 'juliana.moreira@pristino.org.br' });
  assert.equal(repetido.status, 400);
  assert.equal(repetido.corpo.erros.email, 'Este e-mail já pertence a outro colaborador.');

  const homonima = await op.post('/colaboradores', { nome: 'Juliana Moreira', id_setor: 4, cargo: 'Técnica de campo' });
  assert.equal(homonima.status, 201);
  assert.equal((await op.post('/colaboradores', { nome: 'Em Setor Inativo', id_setor: 6 })).status, 400);
});

test('RF_B4: desligamento só pelo Administrador, com data efetiva; encerra utilizações e a coordenação (RN07, RN37)', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();
  // Juliana (4) coordena Projetos Ambientais e passa a usar uma instância
  await t.sql(`INSERT INTO utilizacao (id_instancia, id_colaborador, data_inicio) VALUES (1, 4, ?)`, [t.dataLocal(-30)]);

  assert.equal((await op.post('/colaboradores/4/desligamento', { data_efetiva: ontem() })).status, 403);
  const previa = await admin.get('/colaboradores/4/previa-desligamento');
  assert.equal(previa.corpo.utilizacoes.length, 1);
  assert.deepEqual(previa.corpo.setores_coordenados.map((s) => s.nome), ['Projetos Ambientais']);

  assert.equal((await admin.post('/colaboradores/4/desligamento', {})).status, 400);
  const r = await admin.post('/colaboradores/4/desligamento', { data_efetiva: ontem(), motivo: 'Fim do contrato' });
  assert.equal(r.status, 200);
  assert.equal(r.corpo.utilizacoes_encerradas, 1);
  assert.deepEqual(r.corpo.setores_sem_coordenador, ['Projetos Ambientais']);
  assert.equal(r.corpo.colaborador.data_desligamento, ontem());

  const [utilizacao] = await t.sql(`SELECT DATE_FORMAT(data_fim, '%Y-%m-%d') AS fim FROM utilizacao WHERE id_colaborador = 4`);
  assert.equal(utilizacao.fim, ontem());
  const [instancia] = await t.sql('SELECT situacao FROM instancia WHERE id_instancia = 1');
  assert.equal(instancia.situacao, 'ativa');
  const [setor] = await t.sql('SELECT id_coordenador FROM setor WHERE id_setor = 3');
  assert.equal(setor.id_coordenador, null);
  // o desligado sai das listas de seleção, mas continua no cadastro
  assert.ok(!(await op.get('/colaboradores/ativos')).corpo.some((c) => c.id_colaborador === 4));
  assert.ok((await op.get('/colaboradores?situacao=desligado')).corpo.some((c) => c.id_colaborador === 4));
  // com participações e responsabilidades, não exclui (RN22)
  assert.equal((await admin.delete('/colaboradores/4')).status, 409);
});

test('RF_B5: coordenador precisa ser colaborador ativo; inativação com data efetiva (CA17); exclusão sem vínculos', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();
  const comDesligado = await op.post('/setores', { nome: 'Geoprocessamento', id_coordenador: 9 });
  assert.equal(comDesligado.status, 400);
  assert.ok(comDesligado.corpo.erros.id_coordenador);
  const novo = await op.post('/setores', { nome: 'Geoprocessamento', id_coordenador: 3 });
  assert.equal(novo.status, 201);
  assert.equal(novo.corpo.nome_coordenador, 'Carlos Eduardo Alves');
  assert.equal((await op.post('/setores', { nome: 'geoprocessamento' })).status, 400);

  const lista = (await op.get('/setores')).corpo;
  const administrativo = lista.find((s) => s.nome === 'Administrativo');
  assert.ok(administrativo.colaboradores >= 1 && administrativo.equipamentos >= 1);
  assert.ok(lista.find((s) => s.nome === 'Educação Ambiental').data_inativacao);

  // Administrador inativa pela edição: exige data efetiva
  const semData = await admin.put(`/setores/${novo.corpo.id_setor}`, { nome: 'Geoprocessamento', id_coordenador: 3, situacao: 'inativo' });
  assert.equal(semData.status, 400);
  assert.ok(semData.corpo.erros.data_efetiva);
  const inativo = await admin.put(`/setores/${novo.corpo.id_setor}`, {
    nome: 'Geoprocessamento', id_coordenador: 3, situacao: 'inativo', data_efetiva: ontem()
  });
  assert.equal(inativo.status, 200);
  assert.equal(inativo.corpo.data_inativacao, ontem());
  const [evento] = await t.sql(
    `SELECT DATE_FORMAT(data_evento, '%Y-%m-%d') AS efetiva, DATE(registrado_em) = CURDATE() AS registro_hoje
       FROM movimentacao WHERE entidade = 'setor' AND id_registro = ? AND tipo = 'inativacao'`, [novo.corpo.id_setor]);
  assert.deepEqual({ ...evento }, { efetiva: ontem(), registro_hoje: 1 });

  assert.equal((await admin.delete(`/setores/${administrativo.id_setor}`)).status, 409);
  assert.equal((await admin.delete(`/setores/${novo.corpo.id_setor}`)).status, 200);
});

test('RF_B6: campos por categoria (RN20): placa obrigatória e única para veículo; série opcional', async () => {
  const op = await t.entrarOperador();
  const semPlaca = await op.post('/bens-seguraveis', { categoria: 'veiculo', identificacao: 'Fiat Strada Freedom' });
  assert.equal(semPlaca.status, 400);
  assert.ok(semPlaca.corpo.erros.placa);
  const formato = await op.post('/bens-seguraveis', { categoria: 'veiculo', identificacao: 'Fiat Strada', placa: 'XYZ' });
  assert.ok(formato.corpo.erros.placa);
  const repetida = await op.post('/bens-seguraveis', { categoria: 'veiculo', identificacao: 'Outro', placa: 'qab1d23' });
  assert.equal(repetida.status, 400);
  assert.match(repetida.corpo.erros.placa, /já está cadastrada/);

  const veiculo = await op.post('/bens-seguraveis', {
    categoria: 'veiculo', identificacao: 'Fiat Strada Freedom', placa: 'rtc4e56', renavam: '01234567891',
    ano_modelo: '2024/2025', valor: 98000, id_setor: 4, numero_serie: 'não pertence ao veículo'
  });
  assert.equal(veiculo.status, 201);
  assert.equal(veiculo.corpo.placa, 'RTC-4E56');
  assert.equal(veiculo.corpo.numero_serie, null);

  // obrigatoriedade de série e endereço ainda não validada com o Instituto (Quadro 8)
  assert.equal((await op.post('/bens-seguraveis', { categoria: 'drone', identificacao: 'DJI Mini 4' })).status, 201);
  const imovel = await op.post('/bens-seguraveis', {
    categoria: 'imovel', identificacao: 'Sede', endereco: 'Rua A, 1', matricula: '9.999', area_construida_m2: '250,5'
  });
  assert.equal(imovel.status, 201);
  assert.equal(imovel.corpo.area_construida_m2, 250.5);
});

test('RF_B6: bem coberto por duas apólices mostra as duas e os projetos financiadores, sem campo de projeto (RN40, CA18)', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();
  const mavic = (await op.get('/bens-seguraveis?busca=Mavic')).corpo[0];
  assert.equal(mavic.categoria, 'drone');
  assert.equal(mavic.apolices.length, 2);
  assert.deepEqual(mavic.projetos.map((p) => p.codigo).sort(), ['1301', '2041']);
  assert.ok(!('id_projeto' in mavic));

  // coberto por apólice: não exclui (RN22); inativa com data efetiva
  assert.equal((await admin.delete(`/bens-seguraveis/${mavic.id_bem}`)).status, 409);
  assert.equal((await op.post(`/bens-seguraveis/${mavic.id_bem}/inativacao`, { data_efetiva: ontem() })).status, 200);

  // equipamentos também são bens, mas inativação e exclusão seguem pela RF_B3 (RN08)
  const equipamento = (await op.get('/bens-seguraveis?busca=IP0101')).corpo[0];
  assert.equal(equipamento.e_equipamento, true);
  const r = await op.post(`/bens-seguraveis/${equipamento.id_bem}/inativacao`, { data_efetiva: ontem() });
  assert.equal(r.status, 409);
  assert.equal(r.corpo.codigo, 'BEM_E_EQUIPAMENTO');
});

test('RF_B7: tipos e coberturas; cobertura usada não é excluída, só inativada', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();
  const novo = await op.post('/tipos-seguro', { descricao: 'Transporte', coberturas: ['Avaria', 'Roubo de carga'] });
  assert.equal(novo.status, 201);
  assert.deepEqual(novo.corpo.coberturas.map((c) => c.descricao), ['Avaria', 'Roubo de carga']);
  assert.equal((await op.post('/tipos-seguro', { descricao: 'transporte' })).status, 400);
  assert.equal((await op.post(`/tipos-seguro/${novo.corpo.id_tipo_seguro}/coberturas`, { descricao: 'avaria' })).status, 400);

  const equipamentos = (await op.get('/tipos-seguro')).corpo.find((x) => x.descricao === 'Equipamentos');
  assert.equal(equipamentos.apolices, 1);
  const usada = equipamentos.coberturas.find((c) => c.descricao === 'Quebra acidental');
  assert.equal(usada.em_uso, true);
  assert.equal((await admin.delete(`/tipos-seguro/coberturas/${usada.id_cobertura}`)).status, 409);
  assert.equal((await op.post(`/tipos-seguro/coberturas/${usada.id_cobertura}/inativacao`, {})).status, 200);
  assert.equal((await admin.delete(`/tipos-seguro/${equipamentos.id_tipo_seguro}`)).status, 409);

  // sem uso: o Administrador exclui o tipo, com as coberturas
  assert.equal((await op.delete(`/tipos-seguro/${novo.corpo.id_tipo_seguro}`)).status, 403);
  assert.equal((await admin.delete(`/tipos-seguro/${novo.corpo.id_tipo_seguro}`)).status, 200);
  const [{ total }] = await t.sql('SELECT COUNT(*) AS total FROM cobertura WHERE id_tipo_seguro = ?', [novo.corpo.id_tipo_seguro]);
  assert.equal(total, 0);
});
