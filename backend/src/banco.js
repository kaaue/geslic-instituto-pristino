// Conexão com o MySQL.
// Uso um pool em vez de uma conexão única porque o pool reaproveita conexões
// entre as requisições e reconecta sozinho se o banco cair por um instante.

require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_SENHA || '',
  database: process.env.DB_NOME || 'geslic',
  waitForConnections: true,
  connectionLimit: 10,
  // devolve DECIMAL como número e não como texto, para o front não ter que converter
  decimalNumbers: true
});

module.exports = pool;
