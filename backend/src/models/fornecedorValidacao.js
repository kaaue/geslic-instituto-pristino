// Validações da RF_B1 - Gerenciar fornecedores e seguradoras.
// Devolvem { dados, erros }, com erros no formato campo -> mensagem.

const { normalizarTexto, textoLimitado, FORMATO_EMAIL } = require('../utils/normalizacao');

const TIPOS = ['software', 'seguradora'];

// CNPJ guardado só com os 14 dígitos; a máscara é da interface
function normalizarCnpj(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function validarFornecedor(corpo) {
  const erros = {};
  const razaoSocial = normalizarTexto(corpo.razao_social);
  const cnpj = normalizarCnpj(corpo.cnpj);
  const tipo = corpo.tipo;
  const email = normalizarTexto(corpo.email)?.toLowerCase() || null;

  if (!TIPOS.includes(tipo)) erros.tipo = 'Escolha fornecedor de software ou seguradora.';

  if (!razaoSocial) erros.razao_social = 'A razão social é obrigatória.';
  else if (razaoSocial.length < 3) erros.razao_social = 'A razão social deve ter ao menos 3 caracteres.';
  else if (razaoSocial.length > 120) erros.razao_social = 'A razão social deve ter no máximo 120 caracteres.';

  if (!cnpj) erros.cnpj = 'O CNPJ é obrigatório.';
  else if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) erros.cnpj = 'Informe os 14 dígitos do CNPJ.';

  if (email && (email.length > 120 || !FORMATO_EMAIL.test(email))) erros.email = 'Informe um e-mail válido.';

  const telefone = textoLimitado(corpo.telefone, 20, erros, 'telefone', 'O telefone');
  if (telefone && !/^[\d\s()+-]+$/.test(telefone)) erros.telefone = 'Use só números, espaços, parênteses e hífen.';

  return {
    erros,
    dados: {
      tipo,
      razao_social: razaoSocial,
      nome_fantasia: textoLimitado(corpo.nome_fantasia, 120, erros, 'nome_fantasia', 'O nome fantasia'),
      cnpj,
      contato: textoLimitado(corpo.contato, 80, erros, 'contato', 'O contato'),
      telefone,
      email
    }
  };
}

module.exports = { validarFornecedor, normalizarCnpj, TIPOS };
