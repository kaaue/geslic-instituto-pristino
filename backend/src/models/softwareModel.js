// Model da RF_B2 - Gerenciar softwares.
// O software descreve o produto; a licença registra a aquisição do direito
// de uso. Com licença vinculada, o software não é excluído, apenas inativado
// (RN22), e a data efetiva da inativação fica no histórico (RN37). O mesmo
// nome na mesma versão não se repete (comparação sem maiúsculas e espaços
// extras, RN19).

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const Historico = require('./historicoModel');

const COLUNAS = `
    s.id_software, s.nome, s.versao, s.fabricante, s.categoria, s.observacoes, s.ativo,
    (SELECT COUNT(*) FROM licenca l WHERE l.id_software = s.id_software) AS licencas,
    (SELECT GROUP_CONCAT(l.codigo ORDER BY l.codigo SEPARATOR ', ')
       FROM licenca l WHERE l.id_software = s.id_software) AS codigos_licencas`;

const publico = (l) => l && { ...l, ativo: Boolean(l.ativo) };
const rotulo = (s) => (s.versao ? `${s.nome} ${s.versao}` : s.nome);

function retrato(s) {
  return {
    nome: s.nome, versao: s.versao, fabricante: s.fabricante, categoria: s.categoria,
    observacoes: s.observacoes, ativo: s.ativo === undefined ? true : Boolean(s.ativo)
  };
}

async function buscarOuFalhar(conexao, id, bloquear = false) {
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS} FROM software s WHERE s.id_software = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  if (!linhas[0]) throw AppError.naoEncontrado('Software não encontrado.');
  return publico(linhas[0]);
}

async function conferirDuplicidade(conexao, dados, idAtual) {
  const [linhas] = await conexao.query(
    `SELECT id_software FROM software
      WHERE nome = ? AND COALESCE(versao, '') = COALESCE(?, '') AND id_software <> ?`,
    [dados.nome, dados.versao, idAtual || 0]);
  if (linhas[0]) {
    throw AppError.campos({ nome: dados.versao ? 'Este software já está cadastrado nesta versão.' : 'Este software já está cadastrado.' });
  }
}

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];
  if (filtros.busca) {
    const termo = `%${String(filtros.busca).trim()}%`;
    condicoes.push('(s.nome LIKE ? OR s.fabricante LIKE ? OR s.versao LIKE ?)');
    valores.push(termo, termo, termo);
  }
  if (filtros.categoria) {
    condicoes.push('s.categoria = ?');
    valores.push(String(filtros.categoria));
  }
  if (filtros.situacao === 'ativo') condicoes.push('s.ativo = TRUE');
  if (filtros.situacao === 'inativo') condicoes.push('s.ativo = FALSE');
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} FROM software s
      ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
      ORDER BY s.ativo DESC, s.nome, s.versao`, valores);
  return linhas.map(publico);
}

// Categorias já usadas, para sugerir no formulário
async function listarCategorias() {
  const [linhas] = await pool.query(
    'SELECT DISTINCT categoria FROM software WHERE categoria IS NOT NULL ORDER BY categoria');
  return linhas.map((l) => l.categoria);
}

async function buscar(id) {
  return buscarOuFalhar(pool, id);
}

async function incluir(dados, idUsuario) {
  return comTransacao(async (conexao) => {
    await conferirDuplicidade(conexao, dados, null);
    const [r] = await conexao.query(
      'INSERT INTO software (nome, versao, fabricante, categoria, observacoes) VALUES (?, ?, ?, ?, ?)',
      [dados.nome, dados.versao, dados.fabricante, dados.categoria, dados.observacoes]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'criacao', entidade: 'software', idRegistro: r.insertId,
      descricao: `Software ${rotulo(dados)} cadastrado`, depois: retrato(dados)
    });
    return buscarOuFalhar(conexao, r.insertId);
  });
}

async function alterar(id, dados, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    await conferirDuplicidade(conexao, dados, id);
    await conexao.query(
      'UPDATE software SET nome = ?, versao = ?, fabricante = ?, categoria = ?, observacoes = ? WHERE id_software = ?',
      [dados.nome, dados.versao, dados.fabricante, dados.categoria, dados.observacoes, id]);
    // As licenças guardam o nome do software (coluna legada): acompanham a correção
    if (dados.nome !== atual.nome) {
      await conexao.query('UPDATE licenca SET nome_software = ? WHERE id_software = ?', [dados.nome, id]);
    }
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'correcao', entidade: 'software', idRegistro: id,
      descricao: `Software ${rotulo(dados)}: dados corrigidos`,
      antes: retrato(atual), depois: retrato({ ...dados, ativo: atual.ativo })
    });
    return buscarOuFalhar(conexao, id);
  });
}

async function inativar(id, evento, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    if (!atual.ativo) throw AppError.conflito('Este software já está inativo.');
    await conexao.query('UPDATE software SET ativo = FALSE WHERE id_software = ?', [id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'inativacao', entidade: 'software', idRegistro: id, dataEvento: evento.data_efetiva,
      descricao: `Software ${rotulo(atual)} inativado`, motivo: evento.motivo,
      antes: retrato(atual), depois: retrato({ ...atual, ativo: false })
    });
    return buscarOuFalhar(conexao, id);
  });
}

async function reativar(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    if (atual.ativo) throw AppError.conflito('Este software já está ativo.');
    await conexao.query('UPDATE software SET ativo = TRUE WHERE id_software = ?', [id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'reativacao', entidade: 'software', idRegistro: id,
      descricao: `Software ${rotulo(atual)} reativado`,
      antes: retrato(atual), depois: retrato({ ...atual, ativo: true })
    });
    return buscarOuFalhar(conexao, id);
  });
}

module.exports = { listar, listarCategorias, buscar, incluir, alterar, inativar, reativar };
