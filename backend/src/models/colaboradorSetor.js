// Setores do colaborador (migração 006): relação N:N em colaborador_setor.
// Uma pessoa pode atuar em mais de um setor; o cadastro exige ao menos um.
// Funções comuns aos models que mostram ou gravam o setor do colaborador.

const AppError = require('../utils/AppError');

// Nomes dos setores, em ordem alfabética, separados por vírgula ("CAOMA, Onça").
// `alias` é o apelido da tabela colaborador na consulta.
const nomesSetoresSql = (alias = 'c') => `
    (SELECT GROUP_CONCAT(s_.nome ORDER BY s_.nome SEPARATOR ', ')
       FROM colaborador_setor cs_ JOIN setor s_ ON s_.id_setor = cs_.id_setor
      WHERE cs_.id_colaborador = ${alias}.id_colaborador)`;

// Ids dos setores, na mesma ordem dos nomes ("3,2")
const idsSetoresSql = (alias = 'c') => `
    (SELECT GROUP_CONCAT(cs_.id_setor ORDER BY s_.nome SEPARATOR ',')
       FROM colaborador_setor cs_ JOIN setor s_ ON s_.id_setor = cs_.id_setor
      WHERE cs_.id_colaborador = ${alias}.id_colaborador)`;

// Condição "o colaborador pertence ao setor ?" (um valor na consulta)
const noSetorSql = (alias = 'c') =>
  `EXISTS (SELECT 1 FROM colaborador_setor cs_ WHERE cs_.id_colaborador = ${alias}.id_colaborador AND cs_.id_setor = ?)`;

// "3,2" (texto do GROUP_CONCAT) -> [3, 2]
function lerIds(texto) {
  if (!texto) return [];
  return String(texto).split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0);
}

// Converte a linha do banco: ids_setores vira lista de números
function comSetores(linha) {
  if (!linha) return linha;
  return { ...linha, ids_setores: lerIds(linha.ids_setores), nome_setor: linha.nome_setor || '' };
}

// Lista de setores recebida do formulário: aceita ids_setores (lista) ou o
// antigo id_setor (um só). Sem repetição; inválidos viram erro em `campo`.
function lerSetores(corpo, erros, campo = 'ids_setores', mensagem = 'Selecione ao menos um setor.') {
  let lista = corpo.ids_setores;
  if (lista === undefined || lista === null) {
    lista = corpo.id_setor === undefined || corpo.id_setor === null || corpo.id_setor === '' ? [] : [corpo.id_setor];
  }
  if (!Array.isArray(lista)) lista = [lista];
  const ids = [...new Set(lista.map(Number))];
  if (ids.length === 0 || ids.some((n) => !Number.isInteger(n) || n <= 0)) erros[campo] = mensagem;
  return ids.filter((n) => Number.isInteger(n) && n > 0);
}

// Setores existentes; um setor inativo só fica se o colaborador já estava nele
async function conferirSetores(conexao, ids, idsAtuais = [], campo = 'ids_setores') {
  if (!ids.length) throw AppError.campos({ [campo]: 'Selecione ao menos um setor.' });
  const [linhas] = await conexao.query('SELECT id_setor, nome, ativo FROM setor WHERE id_setor IN (?)', [ids]);
  if (linhas.length !== ids.length) throw AppError.campos({ [campo]: 'Setor não encontrado.' });
  const inativos = linhas.filter((s) => !s.ativo && !idsAtuais.includes(s.id_setor));
  if (inativos.length) {
    throw AppError.campos({ [campo]: `Setor inativo: ${inativos.map((s) => s.nome).join(', ')}.` });
  }
}

// Substitui os setores do colaborador pela lista recebida
async function gravarSetores(conexao, idColaborador, ids) {
  await conexao.query('DELETE FROM colaborador_setor WHERE id_colaborador = ?', [idColaborador]);
  await conexao.query(
    'INSERT INTO colaborador_setor (id_colaborador, id_setor) VALUES ?',
    [ids.map((id) => [idColaborador, id])]);
}

module.exports = {
  nomesSetoresSql, idsSetoresSql, noSetorSql, lerIds, comSetores, lerSetores, conferirSetores, gravarSetores
};
