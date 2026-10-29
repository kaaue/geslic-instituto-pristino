// Monta o banco do GESLIC (DB_NOME no .env) a partir dos scripts da pasta
// database/. Três modos, todos disparados pelo npm:
//
//   npm run db:setup            banco + tabelas + dados de referência + usuário "admin"
//   npm run db:setup:exemplos   o mesmo + dados de exemplo e usuários de teste
//   npm run db:reset            APAGA o banco e recria tudo (aceita --exemplos)
//
// db:setup e db:setup:exemplos não apagam nada: se o banco já tiver tabelas,
// param e indicam o db:reset.
//
// Ordem dos scripts:
//   schema.sql     tabelas, restrições e gatilhos
//   seed.sql       dados de referência (perfis e permissões)
//   seed_dev.sql   dados de exemplo (só com --exemplos)
// As contas de acesso são criadas aqui, e não em SQL, porque a senha precisa
// virar hash antes de ir para o banco.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const { banco, contas } = require('../src/config/env');
const { gerarHashSenha } = require('../src/utils/senha');

const PASTA_SQL = path.resolve(__dirname, '../../database');
const reset = process.argv.includes('--reset');
const exemplos = process.argv.includes('--exemplos');

// Usuários de teste, criados só com --exemplos. Cada um ligado a um
// colaborador da carga de exemplo, para mostrar os dois perfis (RN21).
const USUARIOS_TESTE = [
  { login: 'ana.ribeiro', perfil: 'Administrador', email: 'ana.ribeiro@pristino.org.br' },
  { login: 'carlos.alves', perfil: 'Operador', email: 'carlos.alves@pristino.org.br' }
];

// O nome do banco entra no SQL sem parâmetro (CREATE DATABASE não aceita ?),
// por isso só aceito letras, números e sublinhado.
if (!/^\w+$/.test(banco.database)) {
  console.error(`Nome de banco inválido em DB_NOME: "${banco.database}"`);
  process.exit(1);
}

async function rodarScript(conexao, arquivo) {
  await conexao.query(fs.readFileSync(path.join(PASTA_SQL, arquivo), 'utf8'));
  console.log(`  ${arquivo} ok`);
}

async function contarTabelas(conexao, nome) {
  const [linhas] = await conexao.query(
    'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?', [nome]);
  return linhas[0].total;
}

async function criarUsuario(conexao, { login, nome, email, perfil, senha, colaborador }) {
  await conexao.query(
    `INSERT INTO usuario (id_perfil, id_colaborador, nome, login, email, senha_hash)
     SELECT p.id_perfil, ?, ?, ?, ?, ? FROM perfil p WHERE p.nome = ?`,
    [colaborador, nome, login, email, gerarHashSenha(senha), perfil]);
}

async function criarAdmin(conexao) {
  const senha = contas.adminSenha || crypto.randomBytes(9).toString('base64url');
  await criarUsuario(conexao, {
    login: 'admin', nome: 'Administrador do sistema', email: contas.adminEmail,
    perfil: 'Administrador', senha, colaborador: null
  });
  console.log('  usuário "admin" criado');
  if (!contas.adminSenha) {
    console.log(`\n  Senha gerada para "admin": ${senha}`);
    console.log('  Ela não será mostrada de novo. Para escolher a senha, defina ADMIN_SENHA no .env.\n');
  }
}

async function criarUsuariosTeste(conexao) {
  for (const usuario of USUARIOS_TESTE) {
    const [[colaborador]] = await conexao.query(
      'SELECT id_colaborador, nome FROM colaborador WHERE email = ?', [usuario.email]);
    await criarUsuario(conexao, {
      ...usuario, nome: colaborador.nome, colaborador: colaborador.id_colaborador,
      senha: contas.senhaUsuariosTeste
    });
  }
  console.log(`  usuários de teste criados: ${USUARIOS_TESTE.map((u) => `${u.login} (${u.perfil})`).join(', ')}`);
  console.log('  senha dos usuários de teste: a de SENHA_USUARIOS_TESTE no .env (padrão no .env.example)');
}

async function main() {
  const { database, ...semBanco } = banco;
  const conexao = await mysql.createConnection({ ...semBanco, multipleStatements: true });
  try {
    if (reset) {
      await conexao.query(`DROP DATABASE IF EXISTS \`${database}\``);
      console.log(`Banco "${database}" apagado.`);
    } else if (await contarTabelas(conexao, database) > 0) {
      console.error(`O banco "${database}" já existe e tem tabelas; nada foi alterado.`);
      console.error('Para apagar e recriar, use "npm run db:reset".');
      process.exitCode = 1;
      return;
    }

    await conexao.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await conexao.query(`USE \`${database}\``);
    console.log(`Montando o banco "${database}"${exemplos ? ' com dados de exemplo' : ''}:`);

    // Tudo numa transação: se algo falhar no meio dos dados, nada fica pela
    // metade. (O schema.sql é DDL, que o MySQL grava na hora; por isso, se
    // falhar, o caminho é corrigir e rodar db:reset.)
    await rodarScript(conexao, 'schema.sql');
    await conexao.beginTransaction();
    await rodarScript(conexao, 'seed.sql');
    await criarAdmin(conexao);
    if (exemplos) {
      await rodarScript(conexao, 'seed_dev.sql');
      await criarUsuariosTeste(conexao);
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
