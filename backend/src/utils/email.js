// Envio de e-mail, usado só pela recuperação de senha.
//
// O modo vem de EMAIL_MODO (ver config/env.js):
//   smtp     envia pelo servidor SMTP configurado em SMTP_*
//   console  desenvolvimento: escreve a mensagem no terminal da API
//   teste    testes automatizados: guarda a mensagem em memória
// Em produção só o smtp vale: os outros modos são recusados, para o sistema
// nunca fingir um envio que não aconteceu.

const nodemailer = require('nodemailer');
const { email: config, producao } = require('../config/env');

const caixaDeTeste = [];
let transporte = null;

function modoAtivo() {
  if (config.modo === 'smtp') return config.smtp.host ? 'smtp' : null;
  if (['console', 'teste'].includes(config.modo) && !producao) return config.modo;
  return null;
}

function disponivel() {
  return modoAtivo() !== null;
}

// Explica no início da API por que a recuperação por e-mail estaria indisponível
function avisoDeConfiguracao() {
  if (config.modo === 'smtp' && !config.smtp.host) return 'EMAIL_MODO=smtp, mas SMTP_HOST está vazio.';
  if (['console', 'teste'].includes(config.modo) && producao) {
    return `EMAIL_MODO=${config.modo} não é aceito em produção; configure o SMTP.`;
  }
  if (!config.modo) return 'EMAIL_MODO não definido.';
  if (!['smtp', 'console', 'teste'].includes(config.modo)) return `EMAIL_MODO desconhecido: "${config.modo}".`;
  return null;
}

async function enviar({ para, assunto, texto }) {
  const modo = modoAtivo();
  if (!modo) throw new Error('Envio de e-mail não configurado.');

  if (modo === 'teste') {
    caixaDeTeste.push({ para, assunto, texto });
    return;
  }
  if (modo === 'console') {
    console.log(`\n--- E-mail (modo console, NÃO enviado) ---\nPara: ${para}\nAssunto: ${assunto}\n\n${texto}\n------------------------------------------\n`);
    return;
  }
  transporte = transporte || nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined
  });
  await transporte.sendMail({ from: config.remetente, to: para, subject: assunto, text: texto });
}

module.exports = { enviar, disponivel, avisoDeConfiguracao, caixaDeTeste };
