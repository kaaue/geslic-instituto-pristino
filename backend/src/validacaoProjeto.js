// Validações da RF_B6 - Gerenciar projetos institucionais.
// Seguem o mesmo formato de validacao.js (RF_B3): recebem o corpo da requisição
// e devolvem { dados, erros }, com erros no formato campo -> mensagem.

const { normalizarTexto } = require('./validacao');

const FORMATO_CODIGO = /^\d{4}$/;
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

function textoOuNulo(valor) {
  if (valor === null || valor === undefined) return null;
  const limpo = String(valor).trim();
  return limpo === '' ? null : limpo;
}

// Inclusão e alteração dos dados cadastrais do projeto.
// Situação e data de encerramento não vêm daqui: o encerramento é uma ação
// própria (RN17), validada por validarEncerramento.
function validarProjeto(corpo) {
  const erros = {};

  const codigo = textoOuNulo(corpo.codigo);
  const nome = normalizarTexto(corpo.nome);
  const fonte = normalizarTexto(corpo.fonte_financiadora);
  const dataInicio = textoOuNulo(corpo.data_inicio);
  const dataFimPrevista = textoOuNulo(corpo.data_fim_prevista);
  const idResponsavel = corpo.id_responsavel ? Number(corpo.id_responsavel) : null;

  // Código: quatro dígitos, informado pelo usuário (RN19)
  if (!codigo) {
    erros.codigo = 'O código é obrigatório.';
  } else if (!FORMATO_CODIGO.test(codigo)) {
    erros.codigo = 'O código deve ter exatamente 4 dígitos.';
  }

  if (!nome) {
    erros.nome = 'O nome é obrigatório.';
  } else if (nome.length < 3) {
    erros.nome = 'O nome deve ter ao menos 3 caracteres.';
  } else if (nome.length > 120) {
    erros.nome = 'O nome deve ter no máximo 120 caracteres.';
  }

  if (!fonte) {
    erros.fonte_financiadora = 'A fonte financiadora é obrigatória.';
  } else if (fonte.length > 120) {
    erros.fonte_financiadora = 'A fonte financiadora deve ter no máximo 120 caracteres.';
  }

  if (!dataInicio) {
    erros.data_inicio = 'A data de início é obrigatória.';
  } else if (!dataValida(dataInicio)) {
    erros.data_inicio = 'Informe uma data válida.';
  }

  // Término previsto: opcional, mas não pode ser antes do início
  if (dataFimPrevista) {
    if (!dataValida(dataFimPrevista)) {
      erros.data_fim_prevista = 'Informe uma data válida.';
    } else if (dataValida(dataInicio) && dataFimPrevista < dataInicio) {
      erros.data_fim_prevista = 'O término previsto não pode ser anterior ao início.';
    }
  }

  if (corpo.id_responsavel && (!Number.isInteger(idResponsavel) || idResponsavel <= 0)) {
    erros.id_responsavel = 'Responsável inválido.';
  }

  return {
    erros,
    dados: {
      codigo,
      nome,
      fonte_financiadora: fonte,
      id_responsavel: idResponsavel,
      data_inicio: dataInicio,
      data_fim_prevista: dataFimPrevista
    }
  };
}

// Encerramento manual (RN17): data obrigatória, não anterior ao início e não futura.
function validarEncerramento(corpo, projeto) {
  const erros = {};
  const data = textoOuNulo(corpo.data_encerramento);
  if (!data) {
    erros.data_encerramento = 'Informe a data de encerramento.';
  } else if (!dataValida(data)) {
    erros.data_encerramento = 'Informe uma data válida.';
  } else if (data < projeto.data_inicio) {
    erros.data_encerramento = 'O encerramento não pode ser anterior ao início do projeto.';
  } else if (data > hoje()) {
    erros.data_encerramento = 'O encerramento não pode ser registrado com data futura.';
  }
  return { erros, data };
}

// Prorrogação do término previsto: a nova data precisa ser posterior à atual.
function validarProrrogacao(corpo, projeto) {
  const erros = {};
  const data = textoOuNulo(corpo.data_fim_prevista);
  if (!data) {
    erros.data_fim_prevista = 'Informe o novo término previsto.';
  } else if (!dataValida(data)) {
    erros.data_fim_prevista = 'Informe uma data válida.';
  } else if (data < projeto.data_inicio) {
    erros.data_fim_prevista = 'O término previsto não pode ser anterior ao início.';
  } else if (projeto.data_fim_prevista && data <= projeto.data_fim_prevista) {
    erros.data_fim_prevista = 'A prorrogação deve ser posterior ao término atual.';
  }
  return { erros, data };
}

module.exports = { validarProjeto, validarEncerramento, validarProrrogacao, dataValida, hoje };
