// Validações da RF_B4 - Gerenciar colaboradores.
// Cadastro mínimo (seção 2.3.2, privacidade): nome, setores, cargo e e-mail.
// O colaborador pode estar em mais de um setor (ids_setores); ao menos um.

const { normalizarTexto, textoLimitado, FORMATO_EMAIL } = require('../utils/normalizacao');
const { lerSetores } = require('./colaboradorSetor');

function validarColaborador(corpo) {
  const erros = {};
  const nome = normalizarTexto(corpo.nome);
  const email = normalizarTexto(corpo.email)?.toLowerCase() || null;
  const idsSetores = lerSetores(corpo, erros);

  if (!nome) erros.nome = 'O nome é obrigatório.';
  else if (nome.length < 3) erros.nome = 'O nome deve ter ao menos 3 caracteres.';
  else if (nome.length > 120) erros.nome = 'O nome deve ter no máximo 120 caracteres.';


  if (email && (email.length > 120 || !FORMATO_EMAIL.test(email))) erros.email = 'Informe um e-mail válido.';

  return {
    erros,
    dados: {
      nome,
      ids_setores: idsSetores,
      cargo: textoLimitado(corpo.cargo, 80, erros, 'cargo', 'O cargo'),
      email
    }
  };
}

module.exports = { validarColaborador };
