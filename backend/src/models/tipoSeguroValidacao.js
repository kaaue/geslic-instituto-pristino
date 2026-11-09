// Validações da RF_B7 - Gerenciar tipos de seguro e coberturas.

const { normalizarTexto } = require('../utils/normalizacao');

function lerDescricao(valor, maximo, erros, campo = 'descricao') {
  const descricao = normalizarTexto(valor);
  if (!descricao) erros[campo] = 'A descrição é obrigatória.';
  else if (descricao.length < 2) erros[campo] = 'A descrição deve ter ao menos 2 caracteres.';
  else if (descricao.length > maximo) erros[campo] = `A descrição deve ter no máximo ${maximo} caracteres.`;
  return descricao;
}

// Tipo de seguro; na inclusão, pode trazer as primeiras coberturas
function validarTipo(corpo, { edicao = false } = {}) {
  const erros = {};
  const dados = { descricao: lerDescricao(corpo.descricao, 80, erros) };
  if (!edicao && corpo.coberturas !== undefined) {
    const lista = Array.isArray(corpo.coberturas) ? corpo.coberturas.map(normalizarTexto).filter(Boolean) : null;
    const vistas = new Set();
    if (!lista) erros.coberturas = 'Informe a lista de coberturas.';
    else if (lista.some((c) => c.length < 2 || c.length > 120)) erros.coberturas = 'Cada cobertura deve ter de 2 a 120 caracteres.';
    else if (lista.some((c) => { const k = c.toLowerCase(); const repetida = vistas.has(k); vistas.add(k); return repetida; })) {
      erros.coberturas = 'Há coberturas repetidas.';
    }
    dados.coberturas = lista || [];
  }
  return { erros, dados };
}

function validarCobertura(corpo) {
  const erros = {};
  return { erros, dados: { descricao: lerDescricao(corpo.descricao, 120, erros) } };
}

module.exports = { validarTipo, validarCobertura };
