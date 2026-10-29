// Model de colaboradores: por enquanto só alimenta as listas de seleção.

const { pool } = require('../config/database');

// Só colaboradores ativos podem ser escolhidos como responsáveis
async function listarAtivos() {
  const [linhas] = await pool.query(
    `SELECT c.id_colaborador, c.nome, c.cargo, s.nome AS nome_setor
       FROM colaborador c
       JOIN setor s ON s.id_setor = c.id_setor
      WHERE c.ativo = TRUE
      ORDER BY c.nome`);
  return linhas;
}

module.exports = { listarAtivos };
