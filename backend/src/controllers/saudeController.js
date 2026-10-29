// Rota simples para conferir se a API e o banco estão de pé

const { pool } = require('../config/database');

async function verificar(req, res) {
  try {
    await pool.query('SELECT 1');
    res.json({ api: 'ok', banco: 'ok' });
  } catch (erro) {
    res.status(500).json({ api: 'ok', banco: 'erro', detalhe: erro.message });
  }
}

module.exports = { verificar };
