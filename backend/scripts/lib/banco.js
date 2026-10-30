// Funções comuns aos scripts de banco (setup-db.js e migrate-db.js):
// conexão, controle das migrações aplicadas e criação das contas iniciais.

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { banco, contas, producao } = require('../../src/config/env');
const { gerarHashSenha, gerarSenhaProvisoria, problemaNaSenha } = require('../../src/utils/senha');

const PASTA_SQL = path.resolve(__dirname, '../../../database');
const PASTA_MIGRACOES = path.join(PASTA_SQL, 'migrations');

// O nome do banco entra no SQL sem parâmetro (CREATE DATABASE não aceita ?),
// por isso só aceito letras, números e sublinhado.
function nomeDoBanco() {
  if (!/^\w+$/.test(banco.database)) {
    throw new Error(`Nome de banco inválido em DB_NOME: "${banco.database}"`);
  }
  return banco.database;
}

// Conexão sem banco selecionado, com vários comandos por chamada (scripts .sql)
async function conectarServidor() {
  const { database, ...semBanco } = banco;
  return mysql.createConnection({ ...semBanco, multipleStatements: true });
}

async function rodarArquivo(conexao, caminho) {
  await conexao.query(fs.readFileSync(caminho, 'utf8'));
  console.log(`  ${path.relative(PASTA_SQL, caminho).replace(/\\/g, '/')} ok`);
}

async function contarTabelas(conexao, nome) {
  const [linhas] = await conexao.query(
    'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = ?', [nome]);
  return linhas[0].total;
}

// ---------------------------------------------------------------
// Migrações: arquivos NNN_descricao.sql em database/migrations, aplicados
// em ordem e registrados em schema_migracao para não rodarem duas vezes.
// ---------------------------------------------------------------

function listarMigracoes() {
  if (!fs.existsSync(PASTA_MIGRACOES)) return [];
  return fs.readdirSync(PASTA_MIGRACOES).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
}

async function garantirTabelaMigracao(conexao) {
  await conexao.query(
    `CREATE TABLE IF NOT EXISTS schema_migracao (
       versao      VARCHAR(100) PRIMARY KEY,
       aplicada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`);
}

async function migracoesAplicadas(conexao) {
  const [linhas] = await conexao.query('SELECT versao FROM schema_migracao');
  return new Set(linhas.map((l) => l.versao));
}

async function registrarMigracao(conexao, versao) {
  await conexao.query('INSERT INTO schema_migracao (versao) VALUES (?)', [versao]);
}

// Instalação nova: o schema.sql já contém o efeito de todas as migrações,
// então elas são só registradas como aplicadas.
async function marcarTodasComoAplicadas(conexao) {
  await garantirTabelaMigracao(conexao);
  for (const versao of listarMigracoes()) await registrarMigracao(conexao, versao);
}

// Aplica as pendentes e devolve quais foram aplicadas
async function aplicarPendentes(conexao) {
  await garantirTabelaMigracao(conexao);
  const aplicadas = await migracoesAplicadas(conexao);
  const novas = [];
  for (const versao of listarMigracoes()) {
    if (aplicadas.has(versao)) continue;
    // DDL do MySQL grava na hora (não entra em transação). Se uma migração
    // falhar no meio, ela não é registrada; corrija e rode de novo.
    await rodarArquivo(conexao, path.join(PASTA_MIGRACOES, versao));
    await registrarMigracao(conexao, versao);
    novas.push(versao);
  }
  return novas;
}

// ---------------------------------------------------------------
// Contas iniciais
// ---------------------------------------------------------------

async function criarUsuario(conexao, { login, nome, email, perfil, senha, colaborador, trocaObrigatoria }) {
  await conexao.query(
    `INSERT INTO usuario
       (id_perfil, id_colaborador, nome, login, email, senha_hash, situacao, troca_senha_obrigatoria)
     SELECT p.id_perfil, ?, ?, ?, ?, ?, 'ativo', ? FROM perfil p WHERE p.nome = ?`,
    [colaborador, nome, login, email, gerarHashSenha(senha), Boolean(trocaObrigatoria), perfil]);
}

// Senha da conta inicial: a de ADMIN_SENHA ou, sem ela, uma provisória.
// Em produção, ADMIN_SENHA fraca (como a fixa de desenvolvimento) é recusada.
function senhaDoAdmin() {
  if (contas.adminSenha) {
    const problema = problemaNaSenha(contas.adminSenha);
    if (producao && problema) {
      throw new Error(`ADMIN_SENHA não pode ser usada em produção: ${problema} ` +
        'Defina uma senha forte ou deixe ADMIN_SENHA vazia para gerar uma provisória.');
    }
    return { senha: contas.adminSenha, provisoria: false };
  }
  return { senha: gerarSenhaProvisoria(), provisoria: true };
}

function avisarSenhaProvisoria(senha) {
  console.log(`\n  Senha provisória de "admin": ${senha}`);
  console.log('  Ela não será mostrada de novo e deve ser trocada no primeiro acesso.');
  console.log('  Para usar uma senha fixa, defina ADMIN_SENHA no .env.\n');
}

// Conta inicial "admin" (RF_B9: "conta inicial definida na configuração").
// Com ADMIN_SENHA no .env, usa essa senha; sem ela, gera uma senha provisória,
// mostra uma vez e obriga a troca no primeiro acesso.
async function criarAdmin(conexao) {
  const { senha, provisoria } = senhaDoAdmin();
  await criarUsuario(conexao, {
    login: 'admin', nome: 'Administrador do sistema', email: contas.adminEmail,
    perfil: 'Administrador', senha, colaborador: null, trocaObrigatoria: provisoria
  });
  console.log('  usuário "admin" criado');
  if (provisoria) avisarSenhaProvisoria(senha);
}

// Redefinição da conta inicial pelo servidor (RN27 e Apêndice 3 da ERS: quando
// nenhum Administrador consegue entrar, o apoio técnico redefine a conta
// inicial). Aplica a senha de ADMIN_SENHA (ou uma provisória) à conta "admin",
// garante que ela está ativa e com perfil Administrador, encerra as sessões
// abertas e registra no histórico. Se a conta não existir, é criada.
async function redefinirAdmin(conexao) {
  const [[admin]] = await conexao.query(`SELECT id_usuario FROM usuario WHERE login = 'admin'`);
  if (!admin) {
    await criarAdmin(conexao);
    return;
  }
  const { senha, provisoria } = senhaDoAdmin();
  await conexao.query(
    `UPDATE usuario u JOIN perfil p ON p.nome = 'Administrador'
        SET u.senha_hash = ?, u.troca_senha_obrigatoria = ?, u.senha_alterada_em = NOW(),
            u.situacao = 'ativo', u.id_perfil = p.id_perfil
      WHERE u.id_usuario = ?`,
    [gerarHashSenha(senha), provisoria, admin.id_usuario]);
  await conexao.query(
    `UPDATE sessao SET encerrada_em = NOW(), motivo_encerramento = 'senha_redefinida'
      WHERE id_usuario = ? AND encerrada_em IS NULL`, [admin.id_usuario]);
  await conexao.query(
    `UPDATE recuperacao_senha SET usada_em = NOW() WHERE id_usuario = ? AND usada_em IS NULL`, [admin.id_usuario]);
  await conexao.query(
    `INSERT INTO movimentacao (id_usuario, tipo, entidade, id_registro, data_evento, descricao)
     VALUES (?, 'senha', 'usuario', ?, CURDATE(), ?)`,
    [admin.id_usuario, admin.id_usuario, 'Conta admin: senha redefinida pelo procedimento do servidor (admin:redefinir)']);
  console.log('  senha da conta "admin" redefinida; sessões abertas encerradas');
  if (provisoria) avisarSenhaProvisoria(senha);
}

// Há ao menos um Administrador ativo? (RN27)
async function existeAdministradorAtivo(conexao) {
  const [linhas] = await conexao.query(
    `SELECT COUNT(*) AS total FROM usuario u JOIN perfil p ON p.id_perfil = u.id_perfil
      WHERE p.nome = 'Administrador' AND u.situacao = 'ativo'`);
  return linhas[0].total > 0;
}

// Usuários de teste, só com dados de exemplo. Cada um ligado a um
// colaborador da carga de exemplo, para mostrar os dois perfis (RN21).
const USUARIOS_TESTE = [
  { login: 'ana.ribeiro', perfil: 'Administrador', email: 'ana.ribeiro@pristino.org.br' },
  { login: 'carlos.alves', perfil: 'Operador', email: 'carlos.alves@pristino.org.br' }
];

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

module.exports = {
  PASTA_SQL, nomeDoBanco, conectarServidor, rodarArquivo, contarTabelas,
  marcarTodasComoAplicadas, aplicarPendentes, listarMigracoes,
  criarAdmin, redefinirAdmin, existeAdministradorAtivo, criarUsuariosTeste
};
