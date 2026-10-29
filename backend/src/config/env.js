// Variáveis de ambiente lidas do .env, num lugar só.
// O resto do código importa daqui em vez de ler process.env direto, assim os
// valores padrão ficam definidos uma vez.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  porta: Number(process.env.PORTA) || 3001,
  banco: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_SENHA || '',
    database: process.env.DB_NOME || 'geslic'
  },
  // Usados só pelo scripts/setup-db.js ao criar as contas iniciais
  contas: {
    // sem ADMIN_SENHA, o setup gera uma senha aleatória e a mostra uma vez
    adminSenha: process.env.ADMIN_SENHA || null,
    adminEmail: process.env.ADMIN_EMAIL || 'admin@pristino.org.br',
    senhaUsuariosTeste: process.env.SENHA_USUARIOS_TESTE || 'geslic123'
  }
};
