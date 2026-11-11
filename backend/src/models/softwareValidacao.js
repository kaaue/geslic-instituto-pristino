// Validações da RF_B2 - Gerenciar softwares.

const { normalizarTexto, textoLimitado } = require('../utils/normalizacao');

function validarSoftware(corpo) {
  const erros = {};
  const nome = normalizarTexto(corpo.nome);
  const fabricante = normalizarTexto(corpo.fabricante);

  if (!nome) erros.nome = 'O nome é obrigatório.';
  else if (nome.length > 80) erros.nome = 'O nome deve ter no máximo 80 caracteres.';

  if (!fabricante) erros.fabricante = 'O fabricante é obrigatório.';
  else if (fabricante.length > 80) erros.fabricante = 'O fabricante deve ter no máximo 80 caracteres.';

  return {
    erros,
    dados: {
      nome,
      versao: textoLimitado(corpo.versao, 30, erros, 'versao', 'A versão'),
      fabricante,
      categoria: textoLimitado(corpo.categoria, 40, erros, 'categoria', 'A categoria'),
      observacoes: textoLimitado(corpo.observacoes, 500, erros, 'observacoes', 'As observações')
    }
  };
}

module.exports = { validarSoftware };
