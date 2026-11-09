// Validações da RF_B4 - Gerenciar colaboradores.
// Cadastro mínimo (seção 2.3.2, privacidade): nome, setor, cargo e e-mail.

const { normalizarTexto, textoLimitado, FORMATO_EMAIL } = require('../utils/normalizacao');

function validarColaborador(corpo) {
  const erros = {};
  const nome = normalizarTexto(corpo.nome);
  const email = normalizarTexto(corpo.email)?.toLowerCase() || null;
  const idSetor = Number(corpo.id_setor);

  if (!nome) erros.nome = 'O nome é obrigatório.';
  else if (nome.length < 3) erros.nome = 'O nome deve ter ao menos 3 caracteres.';
  else if (nome.length > 120) erros.nome = 'O nome deve ter no máximo 120 caracteres.';

  if (!Number.isInteger(idSetor) || idSetor <= 0) erros.id_setor = 'Selecione o setor.';

  if (email && (email.length > 120 || !FORMATO_EMAIL.test(email))) erros.email = 'Informe um e-mail válido.';

  return {
    erros,
    dados: {
      nome,
      id_setor: idSetor,
      cargo: textoLimitado(corpo.cargo, 80, erros, 'cargo', 'O cargo'),
      email
    }
  };
}

module.exports = { validarColaborador };
