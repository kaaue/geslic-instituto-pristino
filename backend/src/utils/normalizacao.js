// Funções de normalização e conferência usadas pelas validações de mais de
// um recurso.

// Texto comum (identificação, tipo, nome): tira espaços das pontas e colapsa os do meio
function normalizarTexto(valor) {
  if (valor === null || valor === undefined) return null;
  const limpo = String(valor).trim().replace(/\s+/g, ' ');
  return limpo === '' ? null : limpo;
}

// Só tira os espaços das pontas; vazio vira nulo
function textoOuNulo(valor) {
  if (valor === null || valor === undefined) return null;
  const limpo = String(valor).trim();
  return limpo === '' ? null : limpo;
}

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

// Data no formato da API (AAAA-MM-DD). Confere também se o dia existe:
// 2026-02-30 tem o formato certo, mas não é uma data válida.
function dataValida(texto) {
  if (!texto || !FORMATO_DATA.test(texto)) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

// Data de hoje no fuso local, no mesmo formato AAAA-MM-DD
function hoje() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

module.exports = { normalizarTexto, textoOuNulo, dataValida, hoje };
