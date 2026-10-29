// Ponto de entrada da API do GESLIC: confere o banco e sobe o servidor.

const app = require('./app');
const { porta, banco } = require('./config/env');
const { pool } = require('./config/database');

async function iniciar() {
  // A API sobe mesmo sem banco, para /api/saude poder mostrar o problema;
  // o aviso no console já diz o que conferir.
  try {
    await pool.query('SELECT 1');
    console.log(`Banco "${banco.database}" conectado em ${banco.host}:${banco.port}`);
  } catch (erro) {
    console.warn(`Não foi possível conectar ao banco "${banco.database}": ${erro.message}`);
    console.warn('Confira o .env e se o banco foi criado com "npm run db:setup".');
  }

  app.listen(porta, () => {
    console.log(`API do GESLIC rodando em http://localhost:${porta}`);
  });
}

iniciar();
