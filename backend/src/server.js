// Ponto de entrada da API do GESLIC: confere o banco e sobe o servidor.

const app = require('./app');
const { porta, banco, email: configEmail } = require('./config/env');
const { pool } = require('./config/database');
const email = require('./utils/email');

async function iniciar() {
  // A API sobe mesmo sem banco, para /api/saude poder mostrar o problema;
  // o aviso no console já diz o que conferir.
  try {
    await pool.query('SELECT 1');
    console.log(`Banco "${banco.database}" conectado em ${banco.host}:${banco.port}`);
    const [[migracao]] = await pool.query(
      `SELECT COUNT(*) AS total FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'usuario' AND column_name = 'situacao'`);
    if (!migracao.total) {
      console.warn('O banco está em uma versão anterior. Rode "npm run db:migrate" antes de usar o sistema.');
    }
  } catch (erro) {
    console.warn(`Não foi possível conectar ao banco "${banco.database}": ${erro.message}`);
    console.warn('Confira o .env e se o banco foi criado com "npm run db:setup".');
  }

  const aviso = email.avisoDeConfiguracao();
  if (aviso) console.warn(`Recuperação de senha por e-mail indisponível: ${aviso}`);
  else if (configEmail.modo === 'console') {
    console.log('E-mail em modo console (desenvolvimento): os links de recuperação aparecem neste terminal.');
  }

  app.listen(porta, () => {
    console.log(`API do GESLIC rodando em http://localhost:${porta}`);
  });
}

iniciar();
