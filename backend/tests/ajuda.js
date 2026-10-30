// Apoio aos testes automatizados (node:test).
//
// Os testes usam um banco próprio, recriado do zero a cada arquivo de teste
// com os dados de exemplo: DB_NOME_TESTE (padrão geslic_teste_automatico).
// Por segurança, o nome precisa conter "teste": o banco de trabalho nunca é
// tocado. A API sobe na mesma execução, numa porta livre, com e-mail em
// memória (EMAIL_MODO=teste).

const { execFileSync } = require('child_process');
const path = require('path');

const BANCO = process.env.DB_NOME_TESTE || 'geslic_teste_automatico';
if (!/teste/.test(BANCO)) throw new Error(`DB_NOME_TESTE precisa conter "teste" (recebido: ${BANCO}).`);

const SENHAS = { admin: 'Admin2026Teste', teste: 'Geslic2026' };

// As variáveis valem antes de carregar o config/env.js (o dotenv não as sobrescreve)
Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_NOME: BANCO,
  EMAIL_MODO: 'teste',
  ADMIN_SENHA: SENHAS.admin,
  SENHA_USUARIOS_TESTE: SENHAS.teste,
  FRONTEND_URL: 'http://localhost:5173'
});

function recriarBanco() {
  execFileSync(process.execPath, [path.join(__dirname, '../scripts/setup-db.js'), '--reset', '--exemplos'], {
    env: process.env, stdio: 'pipe'
  });
}

let servidor;
let base;

async function iniciar() {
  recriarBanco();
  const app = require('../src/app');
  await new Promise((resolver) => { servidor = app.listen(0, resolver); });
  base = `http://localhost:${servidor.address().port}/api`;
}

async function encerrar() {
  await new Promise((resolver) => servidor.close(resolver));
  await require('../src/config/database').pool.end();
}

// Cliente HTTP com "pote" de cookie, como um navegador com uma sessão
function cliente() {
  let cookie = null;
  async function requisicao(metodo, caminho, corpo, cabecalhos = {}) {
    const resposta = await fetch(base + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }), ...cabecalhos },
      body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
    const definido = resposta.headers.get('set-cookie');
    if (definido) {
      const valor = definido.split(';')[0];
      cookie = valor.endsWith('=') ? null : valor;
    }
    const texto = await resposta.text();
    return { status: resposta.status, corpo: texto ? JSON.parse(texto) : null, cabecalhos: resposta.headers };
  }
  return {
    get: (c, h) => requisicao('GET', c, undefined, h),
    post: (c, b, h) => requisicao('POST', c, b, h),
    put: (c, b, h) => requisicao('PUT', c, b, h),
    patch: (c, b, h) => requisicao('PATCH', c, b, h),
    delete: (c, h) => requisicao('DELETE', c, undefined, h),
    get cookie() { return cookie; },
    set cookie(valor) { cookie = valor; }
  };
}

// Cliente já autenticado
async function entrar(login, senha) {
  const c = cliente();
  const r = await c.post('/auth/login', { login, senha });
  if (r.status !== 200) throw new Error(`Login de ${login} falhou: ${r.status} ${JSON.stringify(r.corpo)}`);
  return c;
}

const entrarAdmin = () => entrar('admin', SENHAS.admin);
const entrarAdministradora = () => entrar('ana.ribeiro', SENHAS.teste);
const entrarOperador = () => entrar('carlos.alves', SENHAS.teste);

// Acesso direto ao banco de teste, para preparar situações (ex.: token vencido)
async function sql(consulta, valores) {
  const [linhas] = await require('../src/config/database').pool.query(consulta, valores);
  return linhas;
}

function zerarLimites() {
  require('../src/middlewares/limiteTentativas').limparTodos();
}

module.exports = {
  SENHAS, iniciar, encerrar, cliente, entrar, entrarAdmin, entrarAdministradora, entrarOperador,
  sql, zerarLimites
};
