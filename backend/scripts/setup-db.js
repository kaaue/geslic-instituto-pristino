// Monta o banco do GESLIC (DB_NOME no .env) a partir dos scripts da pasta
// database/. Três modos, todos disparados pelo npm:
//
//   npm run db:setup            banco + tabelas + dados de referência + usuário "admin"
//   npm run db:setup:exemplos   o mesmo + dados de exemplo e usuários de teste
//   npm run db:reset            APAGA o banco e recria tudo (aceita --exemplos)
//
// db:setup e db:setup:exemplos não apagam nada: se o banco já tiver tabelas,
// param e indicam o db:migrate (atualizar) ou o db:reset (recriar).
// O db:reset é bloqueado com NODE_ENV=production.
//
// Ordem dos scripts:
//   schema.sql     tabelas, restrições e gatilhos (já no formato da última migração)
//   seed.sql       dados de referência (perfis e permissões)
//   seed_dev.sql   dados de exemplo (só com --exemplos)
// As contas de acesso são criadas aqui, e não em SQL, porque a senha precisa
// virar hash antes de ir para o banco.

const path = require('path');
const { producao } = require('../src/config/env');
const db = require('./lib/banco');

const reset = process.argv.includes('--reset');
const exemplos = process.argv.includes('--exemplos');

async function main() {
  const database = db.nomeDoBanco();
  if (reset && producao) {
    throw new Error('O db:reset apaga todos os dados e está bloqueado com NODE_ENV=production.');
  }

  const conexao = await db.conectarServidor();
  try {
    if (reset) {
      await conexao.query(`DROP DATABASE IF EXISTS \`${database}\``);
      console.log(`Banco "${database}" apagado.`);
    } else if (await db.contarTabelas(conexao, database) > 0) {
      console.error(`O banco "${database}" já existe e tem tabelas; nada foi alterado.`);
      console.error('Para atualizar sem perder dados, use "npm run db:migrate".');
      console.error('Para apagar e recriar, use "npm run db:reset".');
      process.exitCode = 1;
      return;
    }

    await conexao.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conexao.query(`USE \`${database}\``);
    console.log(`Montando o banco "${database}"${exemplos ? ' com dados de exemplo' : ''}:`);

    // O schema.sql é DDL, que o MySQL grava na hora; se falhar, corrija e
    // rode db:reset. Os dados vão numa transação: ou entram todos, ou nenhum.
    await db.rodarArquivo(conexao, path.join(db.PASTA_SQL, 'schema.sql'));
    await db.marcarTodasComoAplicadas(conexao);
    await conexao.beginTransaction();
    await db.rodarArquivo(conexao, path.join(db.PASTA_SQL, 'seed.sql'));
    await db.criarAdmin(conexao);
    if (exemplos) {
      await db.rodarArquivo(conexao, path.join(db.PASTA_SQL, 'seed_dev.sql'));
      await db.criarUsuariosTeste(conexao);
    }
    await conexao.commit();
    console.log('Pronto.');
  } finally {
    await conexao.end();
  }
}

main().catch((erro) => {
  console.error(`Falha ao montar o banco: ${erro.message}`);
  process.exit(1);
});
