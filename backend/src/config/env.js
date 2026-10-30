// Variáveis de ambiente lidas do .env, num lugar só.
// O resto do código importa daqui em vez de ler process.env direto, assim os
// valores padrão ficam definidos uma vez.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const numero = (valor, padrao) => (Number(valor) > 0 ? Number(valor) : padrao);
const sim = (valor) => ['1', 'true', 'sim'].includes(String(valor || '').toLowerCase());

const nodeEnv = process.env.NODE_ENV || 'development';
const producao = nodeEnv === 'production';

module.exports = {
  nodeEnv,
  producao,
  porta: Number(process.env.PORTA) || 3001,
  // Endereço da interface: origem aceita pelo CORS e base dos links enviados por e-mail
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, ''),

  banco: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_SENHA || '',
    database: process.env.DB_NOME || 'geslic'
  },

  // Sessão no servidor (ver middlewares/auth.js)
  sessao: {
    // validade máxima, contada do login
    duracaoHoras: numero(process.env.SESSAO_DURACAO_HORAS, 8),
    // encerra a sessão sem uso por este tempo
    inatividadeMinutos: numero(process.env.SESSAO_INATIVIDADE_MINUTOS, 60),
    // em HTTPS (produção), o cookie só trafega cifrado
    cookieSeguro: process.env.COOKIE_SEGURO === undefined ? producao : sim(process.env.COOKIE_SEGURO)
  },

  recuperacao: {
    validadeMinutos: numero(process.env.RECUPERACAO_VALIDADE_MINUTOS, 30)
  },

  // Limite de tentativas por janela de tempo (ver middlewares/limiteTentativas.js)
  limites: {
    loginPorConta: numero(process.env.LIMITE_LOGIN_POR_CONTA, 5),
    loginPorIp: numero(process.env.LIMITE_LOGIN_POR_IP, 20),
    recuperacaoPorIp: numero(process.env.LIMITE_RECUPERACAO_POR_IP, 5),
    janelaMinutos: numero(process.env.LIMITE_JANELA_MINUTOS, 15)
  },

  // Envio de e-mail (ver services/email.js). Modos:
  //   smtp     envia de verdade, pelas variáveis SMTP_*
  //   console  só desenvolvimento: escreve a mensagem no terminal da API
  //   teste    só testes automatizados: guarda a mensagem em memória
  // Sem EMAIL_MODO, o padrão é console em desenvolvimento e nenhum em produção
  // (a recuperação por e-mail fica indisponível até configurar o SMTP).
  email: {
    modo: process.env.EMAIL_MODO || (producao ? '' : 'console'),
    remetente: process.env.EMAIL_REMETENTE || 'GESLIC <nao-responda@pristino.org.br>',
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: Number(process.env.SMTP_PORTA) || 587,
      secure: sim(process.env.SMTP_SEGURO),
      user: process.env.SMTP_USUARIO || '',
      pass: process.env.SMTP_SENHA || ''
    }
  },

  // Usados só pelos scripts de banco ao criar as contas iniciais
  contas: {
    // sem ADMIN_SENHA, o script gera uma senha provisória e a mostra uma vez
    adminSenha: process.env.ADMIN_SENHA || null,
    adminEmail: process.env.ADMIN_EMAIL || 'admin@pristino.org.br',
    senhaUsuariosTeste: process.env.SENHA_USUARIOS_TESTE || 'Geslic2026'
  }
};
