// Atualiza um banco existente sem apagar dados: aplica as migrações de
// database/migrations que ainda não foram aplicadas, na ordem do número.
//
//   npm run db:migrate
//
// Bancos criados antes das migrações (sem a tabela schema_migracao) recebem
// todas elas. Ao final, se não houver nenhum Administrador ativo, cria a
// conta inicial "admin" (RN27: o sistema mantém ao menos um Administrador).

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
    console.log(`Atualizando o banco "${database}":`);

    const aplicadas = await db.aplicarPendentes(conexao);
    if (aplicadas.length === 0) console.log('  nenhuma migração pendente');

    if (!(await db.existeAdministradorAtivo(conexao))) {
      console.log('  nenhum Administrador ativo encontrado');
      await db.criarAdmin(conexao);
    }
    console.log('Pronto.');
  } finally {
    await conexao.end();
  }
}

main().catch((erro) => {
  console.error(`Falha ao atualizar o banco: ${erro.message}`);
  process.exit(1);
});
