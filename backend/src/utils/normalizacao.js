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

// Data efetiva de um evento (RN37): obrigatória, válida e não futura. A data
// e a hora do registro são geradas pelo sistema, separadamente.
function lerDataEfetiva(valor, erros, campo = 'data_efetiva') {
  const texto = textoOuNulo(valor);
  if (!texto) erros[campo] = 'Informe a data efetiva.';
  else if (!dataValida(texto)) erros[campo] = 'Informe uma data válida.';
  else if (texto > hoje()) erros[campo] = 'A data efetiva não pode ser futura.';
  return texto;
}

// Motivo ou observação de um evento, com até 255 caracteres
function lerMotivo(valor, erros, { obrigatorio = false, campo = 'motivo' } = {}) {
  const texto = normalizarTexto(valor);
  if (!texto && obrigatorio) erros[campo] = 'Informe o motivo.';
  else if (texto && texto.length > 255) erros[campo] = 'Use no máximo 255 caracteres.';
  return texto;
}

// Texto opcional com tamanho máximo; vazio vira nulo
function textoLimitado(valor, maximo, erros, campo, rotulo = 'O campo') {
  const texto = normalizarTexto(valor);
  if (texto && texto.length > maximo) erros[campo] = `${rotulo} deve ter no máximo ${maximo} caracteres.`;
  return texto;
}

// id numérico positivo, opcional
function lerId(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : NaN;
}

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = {
  normalizarTexto, textoOuNulo, dataValida, hoje, lerDataEfetiva, lerMotivo, textoLimitado, lerId, FORMATO_EMAIL
};
