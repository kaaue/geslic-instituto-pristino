// Redefine a conta inicial "admin" pelo servidor (RN27 e Apêndice 3 da ERS),
// para quando ninguém consegue entrar como Administrador:
//
//   npm run admin:redefinir
//
// Usa a senha de ADMIN_SENHA no .env (sem ela, gera uma provisória, mostrada
// uma vez, com troca obrigatória). A conta fica ativa e com perfil
// Administrador, as sessões abertas dela são encerradas e a redefinição vai
// para o histórico. Não altera outras contas nem dados.

const db = require('./lib/banco');

async function main() {
  const database = db.nomeDoBanco();
  const conexao = await db.conectarServidor();
  try {
    if (await db.contarTabelas(conexao, database) === 0) {
      console.error(`O banco "${database}" não existe ou está vazio. Use "npm run db:setup".`);
      process.exitCode = 1;
      return;
    }
    await conexao.query(`USE \`${database}\``);
    const [[migrado]] = await conexao.query(
      `SELECT COUNT(*) AS total FROM information_schema.columns
        WHERE table_schema = DATABASE() AND table_name = 'usuario' AND column_name = 'situacao'`);
    if (!migrado.total) {
      console.error('O banco está em uma versão anterior. Rode "npm run db:migrate" primeiro.');
      process.exitCode = 1;
      return;
    }
    console.log(`Redefinindo a conta "admin" no banco "${database}":`);
    await conexao.beginTransaction();
    await db.redefinirAdmin(conexao);
    await conexao.commit();
    console.log('Pronto.');
  } finally {
    await conexao.end();
  }
}

main().catch((erro) => {
  console.error(`Falha ao redefinir a conta admin: ${erro.message}`);
  process.exit(1);
});
