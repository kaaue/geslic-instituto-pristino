// Permissões nas funções básicas existentes (RF_B3, RF_B6), histórico e
// funções ainda em desenvolvimento.

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const t = require('./ajuda');

before(t.iniciar);
after(t.encerrar);
beforeEach(t.zerarLimites);

const EQUIPAMENTO = {
  etiqueta_instituto: 'IP0150', identificacao: 'Notebook de teste', tipo: 'Notebook', id_setor: 2, id_responsavel: 3
};

test('operador inclui e consulta equipamentos, mas não altera nem exclui', async () => {
  const op = await t.entrarOperador();
  assert.equal((await op.get('/equipamentos')).status, 200);
  const criado = await op.post('/equipamentos', EQUIPAMENTO);
  assert.equal(criado.status, 201);
  const id = criado.corpo.id_equipamento;

  const alterar = await op.put(`/equipamentos/${id}`, { ...EQUIPAMENTO, identificacao: 'Outro nome' });
  assert.equal(alterar.status, 403);
  assert.equal((await op.delete(`/equipamentos/${id}`)).status, 403);

  const [{ identificacao }] = await t.sql('SELECT identificacao FROM bem WHERE id_bem = ?', [id]);
  assert.equal(identificacao, 'Notebook de teste');
});

test('operador inativa equipamento (descarte) e a RN08 continua valendo', async () => {
  const op = await t.entrarOperador();
  // IP0106 (id 6) tem instância NÃO transferível alocada
  const r = await op.post('/equipamentos/6/inativacao');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.instancias_inativadas, 1);
  assert.equal((await op.post('/equipamentos/6/inativacao')).status, 409);
});

test('administrador altera e exclui equipamento; exclusão com vínculo segue bloqueada (RN22)', async () => {
  const admin = await t.entrarAdmin();
  const criado = await admin.post('/equipamentos', { ...EQUIPAMENTO, etiqueta_instituto: 'IP0151' });
  const id = criado.corpo.id_equipamento;
  assert.equal((await admin.put(`/equipamentos/${id}`, { ...EQUIPAMENTO, etiqueta_instituto: 'IP0151', tipo: 'Desktop' })).status, 200);
  assert.equal((await admin.delete(`/equipamentos/${id}`)).status, 200);
  assert.equal((await admin.delete('/equipamentos/1')).status, 409);
});

test('operador inclui, prorroga e encerra projetos, mas não altera nem exclui', async () => {
  const op = await t.entrarOperador();
  const criado = await op.post('/projetos', {
    codigo: '1700', nome: 'Projeto do Operador', fonte_financiadora: 'Teste',
    data_inicio: '2026-01-01', data_fim_prevista: '2026-12-31', id_responsavel: 1, participantes: []
  });
  assert.equal(criado.status, 201);
  const id = criado.corpo.id_projeto;

  assert.equal((await op.put(`/projetos/${id}`, {
    codigo: '1700', nome: 'Renomeado', fonte_financiadora: 'Teste', data_inicio: '2026-01-01', id_responsavel: 1
  })).status, 403);
  assert.equal((await op.delete(`/projetos/${id}`)).status, 403);

  assert.equal((await op.post(`/projetos/${id}/prorrogacao`, { data_fim_prevista: '2027-06-30' })).status, 200);
  assert.equal((await op.post(`/projetos/${id}/encerramento`, { data_encerramento: '2026-03-01' })).status, 200);
});

test('as operações gravam o histórico com a conta responsável', async () => {
  const admin = await t.entrarAdmin();
  const r = await admin.get('/historico?entidade=projeto');
  assert.equal(r.status, 200);
  const tipos = r.corpo.itens.map((i) => i.tipo);
  assert.ok(tipos.includes('criacao') && tipos.includes('prorrogacao') && tipos.includes('encerramento'));
  assert.ok(r.corpo.itens.every((i) => i.login_responsavel === 'carlos.alves'));
  const encerramento = r.corpo.itens.find((i) => i.tipo === 'encerramento');
  assert.equal(encerramento.data_evento, '2026-03-01');
});

test('histórico tem filtros e paginação, só para o Administrador', async () => {
  const admin = await t.entrarAdmin();
  const pagina1 = await admin.get('/historico?por_pagina=2&pagina=1');
  const pagina2 = await admin.get('/historico?por_pagina=2&pagina=2');
  assert.equal(pagina1.status, 200);
  assert.equal(pagina1.corpo.itens.length, 2);
  assert.ok(pagina1.corpo.total >= 4);
  assert.notDeepEqual(pagina1.corpo.itens.map((i) => i.id_movimentacao), pagina2.corpo.itens.map((i) => i.id_movimentacao));
  const filtrado = await admin.get('/historico?entidade=equipamento&tipo=inativacao');
  assert.ok(filtrado.corpo.itens.length >= 1 && filtrado.corpo.itens.every((i) => i.tipo === 'inativacao'));
  assert.equal((await admin.get('/historico/opcoes')).status, 200);

  const op = await t.entrarOperador();
  assert.equal((await op.get('/historico')).status, 403);
});

test('eventos do histórico não podem ser alterados nem excluídos, nem direto no banco (RN22)', async () => {
  await assert.rejects(t.sql(`UPDATE movimentacao SET descricao = 'adulterado'`), /não podem ser alterados/);
  await assert.rejects(t.sql('DELETE FROM movimentacao'), /não podem ser excluídos/);
});

test('funções ainda não implementadas respondem 501, depois da autorização', async () => {
  const admin = await t.entrarAdmin();
  for (const caminho of ['/fornecedores', '/softwares', '/licencas', '/apolices', '/painel', '/relatorios/financeiro', '/notificacoes', '/conta/preferencias']) {
    const r = await admin.get(caminho);
    assert.equal(r.status, 501, caminho);
    assert.equal(r.corpo.codigo, 'NAO_IMPLEMENTADO');
  }
  // a permissão é conferida antes: Operador recebe 403 onde não teria acesso
  const op = await t.entrarOperador();
  assert.equal((await op.put('/fornecedores/1', {})).status, 403);
  assert.equal((await op.get('/licencas/1/chave')).status, 403);
  assert.equal((await admin.get('/licencas/1/chave')).status, 501);
});
