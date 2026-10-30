// Leitura e gravação do cookie de sessão, sem dependência extra.
//
// O cookie é HttpOnly (o JavaScript da página não o lê, o que protege o token
// contra XSS), SameSite=Strict (não acompanha requisições vindas de outros
// sites, o que barra CSRF) e Secure em HTTPS. Path=/api: só vai para a API.

const { sessao } = require('../config/env');

const NOME_COOKIE = 'geslic_sessao';

function lerCookies(req) {
  const cookies = {};
  for (const parte of String(req.headers.cookie || '').split(';')) {
    const posicao = parte.indexOf('=');
    if (posicao < 0) continue;
    const nome = parte.slice(0, posicao).trim();
    try {
      cookies[nome] = decodeURIComponent(parte.slice(posicao + 1).trim());
    } catch {
      // cookie malformado: ignora
    }
  }
  return cookies;
}

function tokenDaSessao(req) {
  return lerCookies(req)[NOME_COOKIE] || null;
}

function atributos(maxAgeSegundos) {
  return [
    'Path=/api',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSegundos}`,
    ...(sessao.cookieSeguro ? ['Secure'] : [])
  ].join('; ');
}

function gravarCookieSessao(res, token) {
  res.append('Set-Cookie', `${NOME_COOKIE}=${encodeURIComponent(token)}; ${atributos(sessao.duracaoHoras * 3600)}`);
}

function apagarCookieSessao(res) {
  res.append('Set-Cookie', `${NOME_COOKIE}=; ${atributos(0)}`);
}

module.exports = { NOME_COOKIE, tokenDaSessao, gravarCookieSessao, apagarCookieSessao };
