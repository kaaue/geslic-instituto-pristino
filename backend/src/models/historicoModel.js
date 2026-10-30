// Histórico de movimentações e auditoria (RF_F13, RF_S7, RN22).
// A gravação acontece dentro da transação de cada operação, para todas as
// contas; a consulta é exclusiva de quem tem a permissão auditoria.consultar.
// Os eventos não podem ser alterados nem excluídos (gatilhos no banco).

const { pool } = require('../config/database');

// Nada que pareça segredo vai para o histórico: senha, hash, token ou chave
const CAMPO_SECRETO = /senha|hash|token|chave/i;

function semSegredos(dados) {
  if (!dados || typeof dados !== 'object') return dados ?? null;
  return Object.fromEntries(Object.entries(dados).filter(([campo]) => !CAMPO_SECRETO.test(campo)));
}

// Grava um evento. `conexao` é a da transação da operação, para o evento só
// existir se a operação gravar.
async function registrar(conexao, evento) {
  await conexao.query(
    `INSERT INTO movimentacao
       (id_usuario, tipo, entidade, id_registro, id_licenca, id_instancia, id_apolice,
        data_evento, descricao, motivo, dados_anteriores, dados_posteriores)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()), ?, ?, ?, ?)`,
    [
      evento.idUsuario, evento.tipo, evento.entidade, evento.idRegistro,
      evento.idLicenca || null, evento.idInstancia || null, evento.idApolice || null,
      evento.dataEvento || null, evento.descricao.slice(0, 255),
      evento.motivo ? String(evento.motivo).slice(0, 255) : null,
      evento.antes ? JSON.stringify(semSegredos(evento.antes)) : null,
      evento.depois ? JSON.stringify(semSegredos(evento.depois)) : null
    ]);
}

function montarFiltros(filtros) {
  const condicoes = [];
  const valores = [];
  if (/^\d{4}-\d{2}-\d{2}$/.test(filtros.inicio || '')) {
    condicoes.push('m.data_evento >= ?');
    valores.push(filtros.inicio);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(filtros.fim || '')) {
    condicoes.push('m.data_evento <= ?');
    valores.push(filtros.fim);
  }
  if (filtros.tipo) {
    condicoes.push('m.tipo = ?');
    valores.push(filtros.tipo);
  }
  if (filtros.entidade) {
    condicoes.push('m.entidade = ?');
    valores.push(filtros.entidade);
  }
  if (filtros.id_usuario) {
    condicoes.push('m.id_usuario = ?');
    valores.push(Number(filtros.id_usuario));
  }
  if (filtros.busca) {
    condicoes.push('(m.descricao LIKE ? OR m.motivo LIKE ?)');
    const termo = `%${String(filtros.busca).trim()}%`;
    valores.push(termo, termo);
  }
  return { where: condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : '', valores };
}

// Consulta paginada, do mais recente para o mais antigo
async function listar(filtros, { pagina, porPagina }) {
  const { where, valores } = montarFiltros(filtros);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM movimentacao m ${where}`, valores);
  const [linhas] = await pool.query(
    `SELECT m.id_movimentacao, m.tipo, m.entidade, m.id_registro,
            DATE_FORMAT(m.data_evento, '%Y-%m-%d') AS data_evento,
            DATE_FORMAT(m.registrado_em, '%Y-%m-%dT%H:%i:%s') AS registrado_em,
            m.descricao, m.motivo, m.dados_anteriores, m.dados_posteriores,
            m.id_usuario, u.nome AS nome_responsavel, u.login AS login_responsavel
       FROM movimentacao m
       JOIN usuario u ON u.id_usuario = m.id_usuario
       ${where}
      ORDER BY m.registrado_em DESC, m.id_movimentacao DESC
      LIMIT ? OFFSET ?`,
    [...valores, porPagina, (pagina - 1) * porPagina]);
  return { itens: linhas, total, pagina, por_pagina: porPagina };
}

// Valores existentes, para os filtros da tela
async function opcoesDeFiltro() {
  const [tipos] = await pool.query('SELECT DISTINCT tipo FROM movimentacao ORDER BY tipo');
  const [entidades] = await pool.query('SELECT DISTINCT entidade FROM movimentacao ORDER BY entidade');
  const [responsaveis] = await pool.query(
    `SELECT DISTINCT u.id_usuario, u.nome, u.login
       FROM movimentacao m JOIN usuario u ON u.id_usuario = m.id_usuario
      ORDER BY u.nome`);
  return {
    tipos: tipos.map((l) => l.tipo),
    entidades: entidades.map((l) => l.entidade),
    responsaveis
  };
}

module.exports = { registrar, listar, opcoesDeFiltro, semSegredos };
