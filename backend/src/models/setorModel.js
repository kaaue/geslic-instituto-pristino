// Model de setores (RF_B5).
// Implementado: a lista dos ativos, usada nas listas de seleção.
// EM DESENVOLVIMENTO (501): o cadastro completo, com responsável e as
// quantidades de colaboradores e equipamentos; setor com vínculos só é
// inativado (RN22).

const { pool } = require('../config/database');
const { modelPendente } = require('../utils/pendente');

async function listarAtivos() {
  const [linhas] = await pool.query(
    'SELECT id_setor, nome FROM setor WHERE ativo = TRUE ORDER BY nome');
  return linhas;
}

module.exports = {
  listarAtivos,
  ...modelPendente('RF_B5 Gerenciar setores', {
    buscar: 'consulta de um setor',
    incluir: 'inclusão',
    alterar: 'alteração',
    inativar: 'inativação',
    excluir: 'exclusão'
  })
};
