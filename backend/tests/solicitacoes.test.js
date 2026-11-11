// Solicitações de ajuste (RF_B10: RN36, RN42, CA10, CA14, CA15), preferências
// de aviso (RF_B9: RN24, CA21, CA22) e inatividade da sessão (RN32, CA04).

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const t = require('./ajuda');

before(t.iniciar);
after(t.encerrar);
beforeEach(t.zerarLimites);

// Segundo Operador, para conferir que todos veem as solicitações de todos (CA15)
async function criarSegundoOperador() {
  const { gerarHashSenha } = require('../src/utils/senha');
  await t.sql(
    `INSERT INTO usuario (id_perfil, nome, login, email, senha_hash, situacao)
     SELECT id_perfil, 'Marina Castro Lima', 'marina.lima', 'marina.lima@pristino.org.br', ?, 'ativo'
       FROM perfil WHERE nome = 'Operador'`, [gerarHashSenha(t.SENHAS.teste)]);
  return t.entrar('marina.lima', t.SENHAS.teste);
}

test('Operador emite solicitação de ajuste; o Administrador corrige direto e não emite (CA10)', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();

  const tipos = await op.get('/solicitacoes-ajuste/entidades');
  assert.ok(tipos.corpo.some((e) => e.valor === 'equipamento'));
  const opcoes = await op.get('/solicitacoes-ajuste/opcoes?entidade=equipamento');
  assert.ok(opcoes.corpo.some((o) => o.rotulo.startsWith('IP0107')));

  const invalida = await op.post('/solicitacoes-ajuste', { entidade: 'equipamento', id_registro: 9999, descricao: 'Ajustar o setor' });
  assert.equal(invalida.status, 400);
  assert.ok(invalida.corpo.erros.id_registro);
  assert.equal((await op.post('/solicitacoes-ajuste', { entidade: 'equipamento', id_registro: 1, descricao: 'x' })).status, 400);

  const r = await op.post('/solicitacoes-ajuste', {
    entidade: 'setor', id_registro: 4, descricao: 'O setor ADMINISTRATIVO mudou de nome para Administrativo e Financeiro.'
  });
  assert.equal(r.status, 201);
  assert.equal(r.corpo.situacao, 'pendente');
  assert.equal(r.corpo.nome_solicitante, 'Carlos Eduardo Alves');
  assert.equal(r.corpo.rotulo_registro, 'ADMINISTRATIVO');
  assert.match(r.corpo.codigo, /^SA-\d{3}$/);

  // o Operador não altera o cadastro nem conclui; o Administrador não emite
  assert.equal((await op.put('/setores/4', { nome: 'Administrativo e Financeiro' })).status, 403);
  assert.equal((await op.post(`/solicitacoes-ajuste/${r.corpo.id_solicitacao}/conclusao`, {})).status, 403);
  assert.equal((await admin.post('/solicitacoes-ajuste', { entidade: 'setor', id_registro: 4, descricao: 'teste do admin' })).status, 403);

  // o Administrador corrige o cadastro e a correção aparece no detalhe, com antes e depois
  assert.equal((await admin.put('/setores/4', { nome: 'Administrativo e Financeiro', id_coordenador: 1 })).status, 200);
  const detalhe = await admin.get(`/solicitacoes-ajuste/${r.corpo.id_solicitacao}`);
  assert.equal(detalhe.corpo.correcoes.length, 1);
  assert.equal(detalhe.corpo.correcoes[0].dados_anteriores.nome, 'ADMINISTRATIVO');
  assert.equal(detalhe.corpo.correcoes[0].dados_posteriores.nome, 'Administrativo e Financeiro');
  // o Operador acompanha, sem os detalhes da auditoria
  assert.equal((await op.get(`/solicitacoes-ajuste/${r.corpo.id_solicitacao}`)).corpo.correcoes, undefined);

  const concluida = await admin.post(`/solicitacoes-ajuste/${r.corpo.id_solicitacao}/conclusao`, { observacao: 'Nome atualizado.' });
  assert.equal(concluida.status, 200);
  assert.equal(concluida.corpo.situacao, 'concluida');
  assert.equal(concluida.corpo.nome_concluinte, 'Administrador do sistema');
  const eventos = await t.sql(
    `SELECT tipo FROM movimentacao WHERE id_solicitacao = ? ORDER BY id_movimentacao`, [r.corpo.id_solicitacao]);
  assert.deepEqual(eventos.map((e) => e.tipo), ['solicitacao', 'conclusao']);
});

test('todos os operadores veem as solicitações de todos; contas aguardando só no painel do Administrador (CA15, RN33)', async () => {
  const carlos = await t.entrarOperador();
  const marina = await criarSegundoOperador();
  const admin = await t.entrarAdmin();
  const daMarina = await marina.post('/solicitacoes-ajuste', {
    entidade: 'colaborador', id_registro: 8, descricao: 'Luciana mudou de cargo: agora é analista administrativa.'
  });
  assert.equal(daMarina.status, 201);

  const painelCarlos = (await carlos.get('/solicitacoes-ajuste/painel')).corpo;
  assert.ok(painelCarlos.pendentes.itens.some((i) => i.id_solicitacao === daMarina.corpo.id_solicitacao));
  assert.ok(painelCarlos.pendentes.itens.every((i) => i.tipo === 'ajuste'));
  assert.ok(painelCarlos.concluidas.length >= 1);

  const painelAdmin = (await admin.get('/solicitacoes-ajuste/painel')).corpo;
  assert.ok(painelAdmin.pendentes.itens.some((i) => i.tipo === 'conta' && i.login === 'gustavo.sales'));
  // concluídas: da mais recente para a mais antiga
  const datas = painelAdmin.concluidas.map((c) => c.concluida_em);
  assert.deepEqual(datas, [...datas].sort().reverse());
});

test('com mais pendências que a página, todas continuam acessíveis pela paginação (CA09)', async () => {
  const op = await t.entrarOperador();
  for (let i = 0; i < 6; i += 1) {
    await op.post('/solicitacoes-ajuste', { entidade: 'software', id_registro: 1, descricao: `Ajuste número ${i + 1} do Microsoft 365` });
  }
  const p1 = (await op.get('/solicitacoes-ajuste/painel?pagina=1')).corpo.pendentes;
  const p2 = (await op.get('/solicitacoes-ajuste/painel?pagina=2')).corpo.pendentes;
  assert.equal(p1.itens.length, p1.por_pagina);
  assert.ok(p1.total > p1.por_pagina);
  const ids = new Set([...p1.itens, ...p2.itens].map((i) => i.id_solicitacao));
  assert.equal(ids.size, p1.itens.length + p2.itens.length);
});

test('presença informativa e conclusão concorrente: a primeira prevalece (RN42, CA14)', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();
  const ana = await t.entrarAdministradora();
  const { corpo } = await op.post('/solicitacoes-ajuste', {
    entidade: 'equipamento', id_registro: 9, descricao: 'O desktop IP0109 foi para o setor Administrativo.'
  });
  const id = corpo.id_solicitacao;

  assert.equal((await op.put(`/solicitacoes-ajuste/${id}/presenca`, { acao: 'visualizando' })).status, 403);
  await admin.put(`/solicitacoes-ajuste/${id}/presenca`, { acao: 'atualizando' });
  const daAna = await ana.put(`/solicitacoes-ajuste/${id}/presenca`, { acao: 'visualizando' });
  assert.deepEqual(daAna.corpo.presencas.map((p) => [p.nome, p.acao, p.propria]), [
    ['Administrador do sistema', 'atualizando', false],
    ['Ana Paula Ribeiro', 'visualizando', true]
  ]);
  // a presença é informativa: as duas podem concluir; a primeira vale
  const primeira = await ana.post(`/solicitacoes-ajuste/${id}/conclusao`, {});
  assert.equal(primeira.status, 200);
  const segunda = await admin.post(`/solicitacoes-ajuste/${id}/conclusao`, { observacao: 'tentativa tardia' });
  assert.equal(segunda.status, 409);
  assert.equal(segunda.corpo.codigo, 'SOLICITACAO_JA_CONCLUIDA');
  assert.equal(segunda.corpo.conclusao.nome_concluinte, 'Ana Paula Ribeiro');
  assert.ok(segunda.corpo.tentativa_em);

  const [linha] = await t.sql('SELECT id_concluinte, observacao_conclusao FROM solicitacao_ajuste WHERE id_solicitacao = ?', [id]);
  assert.equal(linha.observacao_conclusao, null);
  // nem direto no banco a conclusão muda
  await assert.rejects(t.sql(`UPDATE solicitacao_ajuste SET id_concluinte = 1 WHERE id_solicitacao = ?`, [id]), /já concluída/);
  await assert.rejects(t.sql('DELETE FROM solicitacao_ajuste WHERE id_solicitacao = ?', [id]), /não podem ser excluídas/);
});

test('preferências por tipo e prazo; aviso de conta aguardando só para o Administrador (RF_B9, CA21, CA22)', async () => {
  const op = await t.entrarOperador();
  const admin = await t.entrarAdmin();

  const doOperador = (await op.get('/conta/preferencias')).corpo.tipos;
  assert.ok(!doOperador.some((tp) => tp.codigo === 'conta_aguardando'));
  const licenca = doOperador.find((tp) => tp.codigo === 'licenca_vencimento');
  assert.deepEqual(licenca.prazos, [{ quantidade: 6, unidade: 'mes' }, { quantidade: 1, unidade: 'mes' }]);
  assert.equal(licenca.personalizado, false);
  assert.ok((await admin.get('/conta/preferencias')).corpo.tipos.some((tp) => tp.codigo === 'conta_aguardando'));

  // mais de um prazo, com unidades diferentes; desativar um tipo
  const salvo = await op.put('/conta/preferencias', {
    preferencias: [
      { codigo: 'licenca_vencimento', ativo: true, prazos: [{ quantidade: 1, unidade: 'mes' }, { quantidade: 15, unidade: 'dia' }, { quantidade: 6, unidade: 'mes' }] },
      { codigo: 'ajuste_novo', ativo: false }
    ]
  });
  assert.equal(salvo.status, 200);
  const tipos = salvo.corpo.tipos;
  assert.deepEqual(tipos.find((tp) => tp.codigo === 'licenca_vencimento').prazos.map((p) => `${p.quantidade}${p.unidade}`), ['6mes', '1mes', '15dia']);
  assert.equal(tipos.find((tp) => tp.codigo === 'ajuste_novo').ativo, false);
  assert.equal(tipos.find((tp) => tp.codigo === 'apolice_vencimento').personalizado, false);

  const erros = await op.put('/conta/preferencias', {
    preferencias: [
      { codigo: 'apolice_vencimento', ativo: true, prazos: [] },
      { codigo: 'projeto_termino', ativo: true, prazos: [{ quantidade: 2, unidade: 'ano' }] },
      { codigo: 'autorizacao_pendente', ativo: true, prazos: [{ quantidade: 1, unidade: 'semana' }, { quantidade: 1, unidade: 'semana' }] },
      { codigo: 'conta_aguardando', ativo: true }
    ]
  });
  assert.equal(erros.status, 400);
  assert.deepEqual(Object.keys(erros.corpo.erros).sort(), [
    'prazos.apolice_vencimento', 'prazos.autorizacao_pendente', 'prazos.projeto_termino', 'preferencias.conta_aguardando'
  ]);

  // desativar o aviso não tira a conta aguardando do painel (CA22): o painel
  // do Administrador continua com as contas aguardando a mais que o do Operador
  await admin.put('/conta/preferencias', { preferencias: [{ codigo: 'conta_aguardando', ativo: false }] });
  const totalAdmin = (await admin.get('/solicitacoes-ajuste/painel')).corpo.pendentes.total;
  const totalOperador = (await op.get('/solicitacoes-ajuste/painel')).corpo.pendentes.total;
  const [{ n: aguardando }] = await t.sql(`SELECT COUNT(*) AS n FROM usuario WHERE situacao = 'pendente'`);
  assert.ok(aguardando >= 1);
  assert.equal(totalAdmin - totalOperador, aguardando);
});

test('dez minutos sem atividade encerram a sessão; consultas automáticas não a prolongam (RN32, CA04)', async () => {
  const op = await t.entrarOperador();
  const ultimoUso = async () => (await t.sql(
    `SELECT TIMESTAMPDIFF(SECOND, ultimo_uso_em, NOW()) AS parado FROM sessao
      WHERE id_usuario = (SELECT id_usuario FROM usuario WHERE login = 'carlos.alves') AND encerrada_em IS NULL
      ORDER BY id_sessao DESC LIMIT 1`))[0].parado;
  const parar = (minutos) => t.sql(
    `UPDATE sessao SET ultimo_uso_em = DATE_SUB(NOW(), INTERVAL ? MINUTE)
      WHERE id_usuario = (SELECT id_usuario FROM usuario WHERE login = 'carlos.alves') AND encerrada_em IS NULL`, [minutos]);

  assert.equal((await op.get('/auth/me')).corpo.sessao.inatividade_minutos, 10);
  await parar(5);
  const automatica = await op.get('/solicitacoes-ajuste/painel', { 'X-Consulta-Automatica': '1' });
  assert.equal(automatica.status, 200);
  assert.ok(await ultimoUso() >= 299);
  // a atividade humana (mesmo sem outra requisição) renova
  assert.equal((await op.post('/auth/atividade')).status, 200);
  assert.ok(await ultimoUso() < 5);

  await parar(11);
  const expirada = await op.get('/solicitacoes-ajuste/painel', { 'X-Consulta-Automatica': '1' });
  assert.equal(expirada.status, 401);
  assert.equal(expirada.corpo.codigo, 'SESSAO_EXPIRADA');
  assert.equal(expirada.corpo.motivo, 'inatividade');
  assert.match(expirada.corpo.mensagem, /10 minutos sem atividade/);
  const [sessao] = await t.sql(
    `SELECT motivo_encerramento FROM sessao WHERE id_usuario = (SELECT id_usuario FROM usuario WHERE login = 'carlos.alves')
      ORDER BY id_sessao DESC LIMIT 1`);
  assert.equal(sessao.motivo_encerramento, 'inatividade');
});
