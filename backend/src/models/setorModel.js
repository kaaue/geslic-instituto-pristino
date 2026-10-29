// Model de setores: por enquanto só alimenta as listas de seleção.

const { pool } = require('../config/database');

async function listarAtivos() {
  const [linhas] = await pool.query(
    'SELECT id_setor, nome FROM setor WHERE ativo = TRUE ORDER BY nome');
  return linhas;
}

module.exports = { listarAtivos };
