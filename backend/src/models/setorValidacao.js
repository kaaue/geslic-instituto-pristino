// Validações da RF_B5 - Gerenciar setores.

const { normalizarTexto, lerId } = require('../utils/normalizacao');

// Na edição (Administrador), a situação pode mudar: passar a inativo exige
// data efetiva (RN37), conferida no model
function validarSetor(corpo, { edicao = false } = {}) {
  const erros = {};
  const nome = normalizarTexto(corpo.nome);
  const idCoordenador = lerId(corpo.id_coordenador);

  if (!nome) erros.nome = 'O nome do setor é obrigatório.';
  else if (nome.length > 80) erros.nome = 'O nome deve ter no máximo 80 caracteres.';

  if (Number.isNaN(idCoordenador)) erros.id_coordenador = 'Coordenador inválido.';

  const dados = { nome, id_coordenador: Number.isNaN(idCoordenador) ? null : idCoordenador };
  if (edicao) {
    if (corpo.situacao !== undefined && !['ativo', 'inativo'].includes(corpo.situacao)) {
      erros.situacao = 'Situação inválida.';
    }
    dados.situacao = corpo.situacao;
    dados.data_efetiva = corpo.data_efetiva;
    dados.motivo = corpo.motivo;
  }
  return { erros, dados };
}

module.exports = { validarSetor };
