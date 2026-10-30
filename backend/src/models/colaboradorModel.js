// Model de colaboradores (RF_B4).
// Implementado: a lista dos ativos, usada nas listas de seleção.
// EM DESENVOLVIMENTO (501): o cadastro completo, com projetos de que
// participa, aviso de homônimo, e-mail único e desligamento, que encerra as
// utilizações e deixa as instâncias ativas e vagas (RN07, RN19).

const { pool } = require('../config/database');
const { modelPendente } = require('../utils/pendente');

// Só colaboradores ativos podem ser escolhidos como responsáveis
async function listarAtivos() {
  const [linhas] = await pool.query(
    `SELECT c.id_colaborador, c.nome, c.cargo, s.nome AS nome_setor
       FROM colaborador c
       JOIN setor s ON s.id_setor = c.id_setor
      WHERE c.ativo = TRUE
      ORDER BY c.nome`);
  return linhas;
}

module.exports = {
  listarAtivos,
  ...modelPendente('RF_B4 Gerenciar colaboradores', {
    buscar: 'consulta de um colaborador',
    incluir: 'inclusão',
    alterar: 'alteração',
    desligar: 'desligamento',
    excluir: 'exclusão'
  })
};
