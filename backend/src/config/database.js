// Conexão com o MySQL.
// Uso um pool em vez de uma conexão única porque o pool reaproveita conexões
// entre as requisições e reconecta sozinho se o banco cair por um instante.

const mysql = require('mysql2/promise');
const { banco } = require('./env');

const pool = mysql.createPool({
  ...banco,
  waitForConnections: true,
  connectionLimit: 10,
  // devolve DECIMAL como número e não como texto, para o front não ter que converter
  decimalNumbers: true
});

// Executa `trabalho` dentro de uma transação: ou tudo grava, ou nada grava.
// Qualquer erro lançado lá dentro (inclusive um AppError de regra de negócio)
// desfaz a transação e segue adiante para quem chamou.
async function comTransacao(trabalho) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await trabalho(conexao);
    await conexao.commit();
    return resultado;
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
}

module.exports = { pool, comTransacao };
