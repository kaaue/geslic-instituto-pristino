// Validações da RF_B3 - Gerenciar equipamentos.
// Ficam separadas das rotas para que a mesma regra valha na inclusão e na edição,
// e para ficar claro de onde cada regra veio na ERS.

// As etiquetas são comparadas sem diferenciar maiúsculas, minúsculas e espaços
// extras (seção 1.2 e Quadro 9). Normalizo antes de gravar e antes de comparar,
// assim "pri-0101", "PRI-0101 " e "PRI  -0101" não viram três equipamentos.
function normalizarEtiqueta(valor) {
  if (valor === null || valor === undefined) return null;
  const limpo = String(valor).trim().replace(/\s+/g, '').toUpperCase();
  return limpo === '' ? null : limpo;
}

// Texto comum (identificação, tipo): tira espaços das pontas e colapsa os do meio
function normalizarTexto(valor) {
  if (valor === null || valor === undefined) return null;
  const limpo = String(valor).trim().replace(/\s+/g, ' ');
  return limpo === '' ? null : limpo;
}

// IP de Instituto Prístino, seguido de exatamente quatro dígitos
const FORMATO_ETIQUETA_INSTITUTO = /^IP\d{4}$/;
const FORMATO_ETIQUETA_NETSCANNER = /^NS-\d{6}$/;

const CATEGORIAS = ['veiculo', 'imovel', 'drone', 'equipamento', 'outro'];
const SITUACOES = ['ativo', 'inativo'];

// Recebe o corpo da requisição e devolve { dados, erros }.
// erros é um objeto campo -> mensagem, que o front usa para destacar o campo.
function validarEquipamento(corpo) {
  const erros = {};

  const etiquetaInstituto = normalizarEtiqueta(corpo.etiqueta_instituto);
  const etiquetaNetscanner = normalizarEtiqueta(corpo.etiqueta_netscanner);
  const identificacao = normalizarTexto(corpo.identificacao);
  const tipo = normalizarTexto(corpo.tipo);

  // Etiqueta do Instituto: obrigatória e com formato fixo (RN20)
  if (!etiquetaInstituto) {
    erros.etiqueta_instituto = 'A etiqueta do Instituto é obrigatória.';
  } else if (!FORMATO_ETIQUETA_INSTITUTO.test(etiquetaInstituto)) {
    erros.etiqueta_instituto = 'Use o formato IP0000.';
  }

  // Etiqueta NetScanner: opcional, mas se vier precisa estar no formato (RN20)
  if (etiquetaNetscanner && !FORMATO_ETIQUETA_NETSCANNER.test(etiquetaNetscanner)) {
    erros.etiqueta_netscanner = 'Use o formato NS-000000 ou deixe em branco.';
  }

  if (!identificacao) {
    erros.identificacao = 'A identificação é obrigatória.';
  } else if (identificacao.length < 3) {
    erros.identificacao = 'A identificação deve ter ao menos 3 caracteres.';
  }

  if (!tipo) {
    erros.tipo = 'O tipo é obrigatório.';
  }

  const idSetor = Number(corpo.id_setor);
  if (!idSetor) {
    erros.id_setor = 'Selecione o setor.';
  }

  // Responsável é opcional: equipamento de uso geral não tem colaborador nominal
  const usoGeral = corpo.uso_geral === true || corpo.uso_geral === 'true';
  const idResponsavel = corpo.id_responsavel ? Number(corpo.id_responsavel) : null;
  if (usoGeral && idResponsavel) {
    erros.id_responsavel = 'Equipamento de uso geral não tem responsável nominal.';
  }

  const situacao = corpo.situacao || 'ativo';
  if (!SITUACOES.includes(situacao)) {
    erros.situacao = 'Situação inválida.';
  }

  const categoria = corpo.categoria || 'equipamento';
  if (!CATEGORIAS.includes(categoria)) {
    erros.categoria = 'Categoria inválida.';
  }

  // O equipamento não guarda patrimônio nem valor: a etiqueta do Instituto
  // já é o identificador patrimonial dele, e o valor de aquisição interessa
  // ao bem segurável, não ao controle de licenças.

  return {
    erros,
    dados: {
      categoria,
      identificacao,
      id_setor: idSetor,
      situacao,
      etiqueta_instituto: etiquetaInstituto,
      etiqueta_netscanner: etiquetaNetscanner,
      tipo,
      id_responsavel: usoGeral ? null : idResponsavel,
      uso_geral: usoGeral
    }
  };
}

module.exports = { validarEquipamento, normalizarEtiqueta, normalizarTexto };
