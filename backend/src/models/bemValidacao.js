// Validações da RF_B6 - Gerenciar bens seguráveis (RN20).
//
// Campos comuns: categoria, identificação, valor, setor e situação.
// Específicos da categoria: placa (veículo), número de série (drone e
// equipamento), endereço (imóvel). Opcionais: patrimônio e os demais dados
// (Renavam, ano/modelo, matrícula, área). Obrigatórios (ERS 2.7, RN20): placa
// do veículo, número de série do drone e do equipamento e endereço do imóvel.
// Campos que não pertencem à categoria escolhida são descartados.

const { normalizarTexto, textoLimitado, lerId } = require('../utils/normalizacao');

const CATEGORIAS = ['veiculo', 'imovel', 'drone', 'equipamento', 'outro'];

// Campos específicos e opcionais de cada categoria
const CAMPOS_DA_CATEGORIA = {
  veiculo: ['placa', 'renavam', 'ano_modelo'],
  imovel: ['endereco', 'matricula', 'area_construida_m2'],
  drone: ['numero_serie'],
  equipamento: ['numero_serie'],
  outro: ['numero_serie']
};

// Placa antiga (ABC-1234) ou Mercosul (ABC1D23), guardada como ABC-1D23
function normalizarPlaca(valor) {
  const limpo = String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!limpo) return null;
  return /^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(limpo) ? `${limpo.slice(0, 3)}-${limpo.slice(3)}` : limpo;
}

// Número decimal vindo como número ou texto ("180" ou "180,5")
function lerDecimal(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const numero = typeof valor === 'number' ? valor : Number(String(valor).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(numero) ? numero : NaN;
}

function validarBem(corpo) {
  const erros = {};
  const categoria = corpo.categoria;
  const identificacao = normalizarTexto(corpo.identificacao);

  if (!CATEGORIAS.includes(categoria)) erros.categoria = 'Selecione a categoria.';

  if (!identificacao) erros.identificacao = 'A identificação é obrigatória.';
  else if (identificacao.length < 2) erros.identificacao = 'A identificação deve ter ao menos 2 caracteres.';
  else if (identificacao.length > 120) erros.identificacao = 'A identificação deve ter no máximo 120 caracteres.';

  const valor = lerDecimal(corpo.valor);
  if (Number.isNaN(valor) || (valor !== null && valor < 0)) erros.valor = 'Informe um valor válido.';
  else if (valor !== null && valor >= 1e10) erros.valor = 'Valor alto demais.';

  const idSetor = lerId(corpo.id_setor);
  if (Number.isNaN(idSetor)) erros.id_setor = 'Setor inválido.';

  const especificos = {
    placa: normalizarPlaca(corpo.placa),
    numero_serie: textoLimitado(corpo.numero_serie, 60, erros, 'numero_serie', 'O número de série'),
    endereco: textoLimitado(corpo.endereco, 200, erros, 'endereco', 'O endereço'),
    renavam: String(corpo.renavam ?? '').replace(/\D/g, '') || null,
    ano_modelo: normalizarTexto(corpo.ano_modelo),
    matricula: textoLimitado(corpo.matricula, 60, erros, 'matricula', 'A matrícula'),
    area_construida_m2: lerDecimal(corpo.area_construida_m2)
  };

  // Só os campos da categoria escolhida são validados e guardados
  const daCategoria = CAMPOS_DA_CATEGORIA[categoria] || [];
  for (const campo of Object.keys(especificos)) {
    if (!daCategoria.includes(campo)) especificos[campo] = null;
  }

  if ((categoria === 'drone' || categoria === 'equipamento') && !especificos.numero_serie) {
    erros.numero_serie = 'O número de série é obrigatório para esta categoria.';
  }
  if (categoria === 'imovel' && !especificos.endereco) erros.endereco = 'O endereço é obrigatório para imóveis.';
  if (categoria === 'veiculo') {
    if (!especificos.placa) erros.placa = 'A placa é obrigatória para veículos.';
    else if (!/^[A-Z]{3}-\d[A-Z0-9]\d{2}$/.test(especificos.placa)) erros.placa = 'Use o formato ABC-1234 ou ABC-1D23.';
    if (especificos.renavam && !/^\d{9,11}$/.test(especificos.renavam)) erros.renavam = 'O Renavam tem de 9 a 11 dígitos.';
    if (especificos.ano_modelo && !/^\d{4}(\/\d{4})?$/.test(especificos.ano_modelo)) erros.ano_modelo = 'Use o formato 2024 ou 2024/2025.';
  }
  if (categoria === 'imovel' && especificos.area_construida_m2 !== null
      && (Number.isNaN(especificos.area_construida_m2) || especificos.area_construida_m2 <= 0
        || especificos.area_construida_m2 >= 1e8)) {
    erros.area_construida_m2 = 'Informe a área em m², maior que zero.';
  }

  return {
    erros,
    dados: {
      categoria,
      identificacao,
      patrimonio: textoLimitado(corpo.patrimonio, 30, erros, 'patrimonio', 'O patrimônio'),
      valor: Number.isNaN(valor) ? null : valor,
      id_setor: Number.isNaN(idSetor) ? null : idSetor,
      ...especificos
    }
  };
}

module.exports = { validarBem, CATEGORIAS, CAMPOS_DA_CATEGORIA, normalizarPlaca };
