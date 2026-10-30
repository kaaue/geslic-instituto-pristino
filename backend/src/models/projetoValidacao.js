// Validações da RF_B6 - Gerenciar projetos institucionais.
// Seguem o mesmo formato de equipamentoValidacao.js (RF_B3): recebem o corpo
// da requisição e devolvem { dados, erros }, com erros no formato campo -> mensagem.

const { normalizarTexto, textoOuNulo, dataValida, hoje } = require('../utils/normalizacao');

const FORMATO_CODIGO = /^\d{4}$/;

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

  if (!corpo.id_responsavel) {
    erros.id_responsavel = 'O responsável é obrigatório.';
  } else if (!Number.isInteger(idResponsavel) || idResponsavel <= 0) {
    erros.id_responsavel = 'Responsável inválido.';
  }

  // Colaboradores participantes: lista de ids, sem repetição. Ausente na
  // requisição significa "não mexer" nas participações já gravadas.
  let participantes = null;
  if (corpo.participantes !== undefined) {
    if (!Array.isArray(corpo.participantes)) {
      erros.participantes = 'Participantes inválidos.';
    } else {
      participantes = [...new Set(corpo.participantes.map(Number))];
      if (participantes.some((id) => !Number.isInteger(id) || id <= 0)) {
        erros.participantes = 'Participantes inválidos.';
      }
    }
  }

  return {
    erros,
    dados: {
      codigo,
      nome,
      fonte_financiadora: fonte,
      id_responsavel: idResponsavel,
      data_inicio: dataInicio,
      data_fim_prevista: dataFimPrevista,
      participantes
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

module.exports = { validarProjeto, validarEncerramento, validarProrrogacao };
