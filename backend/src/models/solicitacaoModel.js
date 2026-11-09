// Model da RF_B10 - Gerenciar solicitações de ajuste cadastral (RN36, RN42).
//
// - O Operador emite a solicitação pelo painel (ou pelo atalho no cadastro),
//   apontando o cadastro afetado e descrevendo o ajuste; solicitante, data e
//   hora são gerados pelo sistema. Todos os operadores acompanham todas.
// - Qualquer Administrador corrige o cadastro e marca como Concluída. Só há
//   Pendente e Concluída: sem reserva, sem etapa de assumir. A primeira
//   conclusão prevalece; a segunda tentativa não muda autoria nem data.
// - Presença informativa (RN42): a tela do Administrador avisa a cada
//   poucos segundos que está visualizando ou atualizando; a indicação vale
//   por PRESENCA_SEGUNDOS e não bloqueia nada.
// - No painel do Administrador, as contas aguardando aprovação (RF_B8)
//   aparecem junto, diferenciadas e com a ação própria (RN33, RN41).

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const Historico = require('./historicoModel');
const { pode } = require('../middlewares/auth');

const PRESENCA_SEGUNDOS = 45;
const POR_PAGINA = 5;
const CONCLUIDAS_NO_PAINEL = 10;

const ROTULO_CATEGORIA_SQL = `CASE b.categoria WHEN 'veiculo' THEN 'Veículo' WHEN 'imovel' THEN 'Imóvel'
  WHEN 'drone' THEN 'Drone' WHEN 'equipamento' THEN 'Equipamento' ELSE 'Outro' END`;

// Cadastros que podem ser ajustados: rótulo, tela e como montar o rótulo de
// cada registro (o mesmo texto vai para a lista de escolha e para a
// solicitação, guardado no momento da emissão)
const ENTIDADES = {
  equipamento: {
    rotulo: 'Equipamento', tela: '/equipamentos',
    select: `SELECT e.id_equipamento AS id, CONCAT(e.etiqueta_instituto, ' · ', b.identificacao) AS rotulo
               FROM equipamento e JOIN bem b ON b.id_bem = e.id_equipamento`,
    chave: 'e.id_equipamento', ordem: 'e.etiqueta_instituto'
  },
  colaborador: {
    rotulo: 'Colaborador', tela: '/colaboradores',
    select: `SELECT c.id_colaborador AS id, CONCAT(c.nome, ' · ', s.nome) AS rotulo
               FROM colaborador c JOIN setor s ON s.id_setor = c.id_setor`,
    chave: 'c.id_colaborador', ordem: 'c.nome'
  },
  projeto: {
    rotulo: 'Projeto', tela: '/projetos',
    select: `SELECT p.id_projeto AS id, CONCAT(p.codigo, ' · ', p.nome) AS rotulo FROM projeto p`,
    chave: 'p.id_projeto', ordem: 'p.codigo'
  },
  bem: {
    rotulo: 'Bem segurável', tela: '/bens-seguraveis',
    select: `SELECT b.id_bem AS id,
                    CONCAT(${ROTULO_CATEGORIA_SQL}, ' · ', b.identificacao,
                           COALESCE(CONCAT(' · ', b.placa), CONCAT(' · ', b.numero_serie), '')) AS rotulo
               FROM bem b LEFT JOIN equipamento e ON e.id_equipamento = b.id_bem`,
    // equipamentos são ajustados como equipamento
    condicao: 'e.id_equipamento IS NULL',
    chave: 'b.id_bem', ordem: 'b.identificacao'
  },
  setor: {
    rotulo: 'Setor', tela: '/setores',
    select: 'SELECT s.id_setor AS id, s.nome AS rotulo FROM setor s',
    chave: 's.id_setor', ordem: 's.nome'
  },
  software: {
    rotulo: 'Software', tela: '/softwares',
    select: `SELECT s.id_software AS id, CONCAT(s.nome, COALESCE(CONCAT(' ', s.versao), '')) AS rotulo FROM software s`,
    chave: 's.id_software', ordem: 's.nome'
  },
  fornecedor: {
    rotulo: 'Fornecedor ou seguradora', tela: '/fornecedores',
    select: `SELECT f.id_fornecedor AS id, COALESCE(f.nome_fantasia, f.razao_social) AS rotulo FROM fornecedor f`,
    chave: 'f.id_fornecedor', ordem: 'f.razao_social'
  },
  tipo_seguro: {
    rotulo: 'Tipo de seguro', tela: '/tipos-seguro',
    select: 'SELECT t.id_tipo_seguro AS id, t.descricao AS rotulo FROM tipo_seguro t',
    chave: 't.id_tipo_seguro', ordem: 't.descricao'
  }
};

const codigo = (id) => `SA-${String(id).padStart(3, '0')}`;

const COLUNAS = `
    s.id_solicitacao, s.entidade, s.id_registro, s.rotulo_registro, s.descricao, s.situacao,
    DATE_FORMAT(s.criada_em, '%Y-%m-%dT%H:%i:%s') AS criada_em,
    s.id_solicitante, us.nome AS nome_solicitante,
    s.id_concluinte, uc.nome AS nome_concluinte,
    DATE_FORMAT(s.concluida_em, '%Y-%m-%dT%H:%i:%s') AS concluida_em,
    s.observacao_conclusao`;

const TABELAS = `
    FROM solicitacao_ajuste s
    JOIN usuario us      ON us.id_usuario = s.id_solicitante
    LEFT JOIN usuario uc ON uc.id_usuario = s.id_concluinte`;

function publico(linha) {
  if (!linha) return null;
  const entidade = ENTIDADES[linha.entidade];
  return {
    tipo: 'ajuste',
    ...linha,
    codigo: codigo(linha.id_solicitacao),
    rotulo_entidade: entidade?.rotulo || linha.entidade,
    tela: entidade?.tela || null
  };
}

// Tipos de cadastro, para a lista "Tipo de cadastro" da tela
function entidades() {
  return Object.entries(ENTIDADES).map(([valor, e]) => ({ valor, rotulo: e.rotulo }));
}

// Registros de um tipo de cadastro, para a lista "Cadastro afetado"
async function opcoes(entidade) {
  const e = ENTIDADES[entidade];
  if (!e) throw AppError.campos({ entidade: 'Tipo de cadastro inválido.' });
  const [linhas] = await pool.query(
    `${e.select} ${e.condicao ? `WHERE ${e.condicao}` : ''} ORDER BY ${e.ordem} LIMIT 1000`);
  return linhas;
}

async function rotuloDoRegistro(conexao, entidade, id) {
  const e = ENTIDADES[entidade];
  const [linhas] = await conexao.query(
    `${e.select} WHERE ${e.chave} = ? ${e.condicao ? `AND ${e.condicao}` : ''}`, [id]);
  return linhas[0]?.rotulo || null;
}

// Presenças ainda válidas (RN42), por solicitação
async function presencasDe(conexao, ids, idUsuarioAtual) {
  if (ids.length === 0) return new Map();
  const [linhas] = await conexao.query(
    `SELECT p.id_solicitacao, p.id_usuario, u.nome, p.acao
       FROM presenca_solicitacao p JOIN usuario u ON u.id_usuario = p.id_usuario
      WHERE p.id_solicitacao IN (?) AND p.atualizada_em >= DATE_SUB(NOW(), INTERVAL ? SECOND)
      ORDER BY p.acao = 'atualizando' DESC, u.nome`, [ids, PRESENCA_SEGUNDOS]);
  const porSolicitacao = new Map();
  for (const l of linhas) {
    if (!porSolicitacao.has(l.id_solicitacao)) porSolicitacao.set(l.id_solicitacao, []);
    porSolicitacao.get(l.id_solicitacao).push({ nome: l.nome, acao: l.acao, propria: l.id_usuario === idUsuarioAtual });
  }
  return porSolicitacao;
}

async function buscarOuFalhar(conexao, id, bloquear = false) {
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS} ${TABELAS} WHERE s.id_solicitacao = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  if (!linhas[0]) throw AppError.naoEncontrado('Solicitação de ajuste não encontrada.');
  return publico(linhas[0]);
}

// Correções registradas no cadastro afetado desde a emissão (para quem
// conclui: mostra o que já foi feito, com valores anteriores e posteriores)
async function correcoesDesde(conexao, solicitacao) {
  const [linhas] = await conexao.query(
    `SELECT m.tipo, m.descricao, m.motivo, m.dados_anteriores, m.dados_posteriores,
            DATE_FORMAT(m.registrado_em, '%Y-%m-%dT%H:%i:%s') AS registrado_em, u.nome AS nome_responsavel
       FROM movimentacao m JOIN usuario u ON u.id_usuario = m.id_usuario
      WHERE m.entidade = ? AND m.id_registro = ? AND m.tipo <> 'criacao'
        AND m.registrado_em >= STR_TO_DATE(?, '%Y-%m-%dT%H:%i:%s')
      ORDER BY m.registrado_em, m.id_movimentacao`,
    [solicitacao.entidade, solicitacao.id_registro, solicitacao.criada_em]);
  return linhas;
}

async function detalhe(id, usuario, conexao = pool) {
  const solicitacao = await buscarOuFalhar(conexao, id);
  const presencas = (await presencasDe(conexao, [id], usuario.id_usuario)).get(id) || [];
  const resposta = { ...solicitacao, presencas };
  if (pode(usuario, 'ajuste.concluir')) resposta.correcoes = await correcoesDesde(conexao, solicitacao);
  return resposta;
}

// Bloco de solicitações do painel (RN33): pendentes fixadas no topo, com
// paginação própria; concluídas abaixo, da mais recente para a mais antiga,
// até dez. Para quem gerencia contas, as contas aguardando aprovação entram
// entre as pendentes.
async function painel(usuario, { pagina = 1 } = {}) {
  const [ajustes] = await pool.query(
    `SELECT ${COLUNAS} ${TABELAS} WHERE s.situacao = 'pendente' ORDER BY s.criada_em DESC, s.id_solicitacao DESC`);
  let pendentes = ajustes.map(publico);
  if (pode(usuario, 'usuario.gerenciar')) {
    const [contas] = await pool.query(
      `SELECT id_usuario, nome, email, login, DATE_FORMAT(criada_em, '%Y-%m-%dT%H:%i:%s') AS criada_em
         FROM usuario WHERE situacao = 'pendente'`);
    pendentes = pendentes.concat(contas.map((c) => ({ tipo: 'conta', ...c, situacao: 'pendente' })));
    pendentes.sort((a, b) => (a.criada_em < b.criada_em ? 1 : a.criada_em > b.criada_em ? -1 : 0));
  }

  const total = pendentes.length;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const atual = Math.min(Math.max(1, Number(pagina) || 1), paginas);
  const daPagina = pendentes.slice((atual - 1) * POR_PAGINA, atual * POR_PAGINA);
  const presencas = await presencasDe(pool,
    daPagina.filter((p) => p.tipo === 'ajuste').map((p) => p.id_solicitacao), usuario.id_usuario);

  const [concluidas] = await pool.query(
    `SELECT ${COLUNAS} ${TABELAS} WHERE s.situacao = 'concluida'
      ORDER BY s.concluida_em DESC, s.id_solicitacao DESC LIMIT ?`, [CONCLUIDAS_NO_PAINEL]);

  return {
    pendentes: {
      itens: daPagina.map((p) => (p.tipo === 'ajuste' ? { ...p, presencas: presencas.get(p.id_solicitacao) || [] } : p)),
      total,
      pagina: atual,
      por_pagina: POR_PAGINA
    },
    concluidas: concluidas.map(publico)
  };
}

async function criar(dados, usuario) {
  return comTransacao(async (conexao) => {
    const rotulo = await rotuloDoRegistro(conexao, dados.entidade, dados.id_registro);
    if (!rotulo) throw AppError.campos({ id_registro: 'Cadastro não encontrado. Escolha outro registro.' });
    const [r] = await conexao.query(
      `INSERT INTO solicitacao_ajuste (id_solicitante, entidade, id_registro, rotulo_registro, descricao)
       VALUES (?, ?, ?, ?, ?)`,
      [usuario.id_usuario, dados.entidade, dados.id_registro, rotulo.slice(0, 160), dados.descricao]);
    const id = r.insertId;
    await Historico.registrar(conexao, {
      idUsuario: usuario.id_usuario, tipo: 'solicitacao', entidade: 'solicitacao_ajuste', idRegistro: id,
      idSolicitacao: id,
      descricao: `${codigo(id)} emitida: ${ENTIDADES[dados.entidade].rotulo} ${rotulo}`,
      depois: { entidade: dados.entidade, id_registro: dados.id_registro, descricao: dados.descricao }
    });
    return detalhe(id, usuario, conexao);
  });
}

// Conclusão (RN36): grava concluinte e data uma única vez. A atualização só
// acontece se a solicitação ainda estiver pendente; se outra conta concluiu
// antes, a resposta diz quem e quando, e nada muda.
async function concluir(id, observacao, usuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id);
    const [r] = await conexao.query(
      `UPDATE solicitacao_ajuste
          SET situacao = 'concluida', id_concluinte = ?, concluida_em = NOW(), observacao_conclusao = ?
        WHERE id_solicitacao = ? AND situacao = 'pendente'`,
      [usuario.id_usuario, observacao, id]);
    if (r.affectedRows === 0) {
      const concluida = await buscarOuFalhar(conexao, id);
      const [[{ agora }]] = await conexao.query(`SELECT DATE_FORMAT(NOW(), '%Y-%m-%dT%H:%i:%s') AS agora`);
      throw AppError.conflito(
        `${concluida.codigo} já foi concluída por ${concluida.nome_concluinte}. ` +
        'Sua confirmação não foi gravada e não altera a autoria nem a data da conclusão (RN36).',
        'SOLICITACAO_JA_CONCLUIDA',
        {
          conclusao: {
            codigo: concluida.codigo, rotulo_entidade: concluida.rotulo_entidade, rotulo_registro: concluida.rotulo_registro,
            nome_concluinte: concluida.nome_concluinte, concluida_em: concluida.concluida_em
          },
          tentativa_em: agora
        });
    }
    await conexao.query('DELETE FROM presenca_solicitacao WHERE id_solicitacao = ?', [id]);
    await Historico.registrar(conexao, {
      idUsuario: usuario.id_usuario, tipo: 'conclusao', entidade: 'solicitacao_ajuste', idRegistro: id,
      idSolicitacao: id, motivo: observacao,
      descricao: `${atual.codigo} concluída: ${atual.rotulo_entidade} ${atual.rotulo_registro}`,
      antes: { situacao: 'pendente' }, depois: { situacao: 'concluida' }
    });
    return detalhe(id, usuario, conexao);
  });
}

// Presença informativa (RN42): renovada pela tela enquanto está aberta
async function marcarPresenca(id, acao, usuario) {
  const solicitacao = await buscarOuFalhar(pool, id);
  if (solicitacao.situacao === 'pendente') {
    await pool.query(
      `INSERT INTO presenca_solicitacao (id_solicitacao, id_usuario, acao) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE acao = VALUES(acao), atualizada_em = NOW()`, [id, usuario.id_usuario, acao]);
  }
  // Limpeza das presenças antigas, que já não aparecem para ninguém
  await pool.query('DELETE FROM presenca_solicitacao WHERE atualizada_em < DATE_SUB(NOW(), INTERVAL 1 HOUR)');
  return { presencas: (await presencasDe(pool, [id], usuario.id_usuario)).get(id) || [] };
}

async function sairDaPresenca(id, usuario) {
  await pool.query('DELETE FROM presenca_solicitacao WHERE id_solicitacao = ? AND id_usuario = ?', [id, usuario.id_usuario]);
  return { saiu: true };
}

module.exports = {
  ENTIDADES, PRESENCA_SEGUNDOS, entidades, opcoes, painel, detalhe, criar, concluir, marcarPresenca, sairDaPresenca
};
