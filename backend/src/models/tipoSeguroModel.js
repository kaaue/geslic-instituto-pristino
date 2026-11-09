// Model da RF_B7 - Gerenciar tipos de seguro e coberturas.
// Tipos de seguro e as coberturas de cada tipo, oferecidos no registro e na
// renovação de apólices. Coberturas já usadas em apólices não são excluídas,
// apenas inativadas para novos registros (RN22). Os eventos das coberturas
// ficam no histórico do tipo de seguro a que pertencem; a data efetiva das
// inativações fica no evento (RN37).

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const Historico = require('./historicoModel');
const { bloquearExclusaoComVinculos, contarVinculos, juntar } = require('./cadastroComum');

const COLUNAS_TIPO = `
    t.id_tipo_seguro, t.descricao, t.ativo,
    (SELECT COUNT(*) FROM apolice a WHERE a.id_tipo_seguro = t.id_tipo_seguro) AS apolices`;

const COLUNAS_COBERTURA = `
    c.id_cobertura, c.id_tipo_seguro, c.descricao, c.ativo,
    (SELECT COUNT(*) FROM vigencia_cobertura vc WHERE vc.id_cobertura = c.id_cobertura) +
    (SELECT COUNT(*) FROM item_cobertura ic WHERE ic.id_cobertura = c.id_cobertura) AS usos`;

const VINCULOS_TIPO = [
  { sql: 'SELECT COUNT(*) AS total FROM apolice WHERE id_tipo_seguro = ?', singular: 'apólice', plural: 'apólices' },
  { sql: `SELECT COUNT(*) AS total FROM vigencia_cobertura vc JOIN cobertura c ON c.id_cobertura = vc.id_cobertura
           WHERE c.id_tipo_seguro = ?`, singular: 'cobertura contratada em apólice', plural: 'coberturas contratadas em apólices' }
];

const VINCULOS_COBERTURA = [
  { sql: 'SELECT COUNT(*) AS total FROM vigencia_cobertura WHERE id_cobertura = ?', singular: 'vigência de apólice', plural: 'vigências de apólices' },
  { sql: 'SELECT COUNT(*) AS total FROM item_cobertura WHERE id_cobertura = ?', singular: 'item segurado', plural: 'itens segurados' }
];

const ativoBool = (l) => l && { ...l, ativo: Boolean(l.ativo) };

async function coberturasDosTipos(conexao, ids) {
  if (ids.length === 0) return new Map();
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS_COBERTURA} FROM cobertura c WHERE c.id_tipo_seguro IN (?)
      ORDER BY c.ativo DESC, c.id_cobertura`, [ids]);
  const porTipo = new Map();
  for (const c of linhas.map(ativoBool)) {
    if (!porTipo.has(c.id_tipo_seguro)) porTipo.set(c.id_tipo_seguro, []);
    porTipo.get(c.id_tipo_seguro).push({ ...c, em_uso: c.usos > 0 });
  }
  return porTipo;
}

async function comCoberturas(conexao, tipos) {
  const porTipo = await coberturasDosTipos(conexao, tipos.map((t) => t.id_tipo_seguro));
  return tipos.map((t) => ({ ...t, coberturas: porTipo.get(t.id_tipo_seguro) || [] }));
}

async function buscarTipoOuFalhar(conexao, id, bloquear = false) {
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS_TIPO} FROM tipo_seguro t WHERE t.id_tipo_seguro = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  if (!linhas[0]) throw AppError.naoEncontrado('Tipo de seguro não encontrado.');
  return ativoBool(linhas[0]);
}

async function buscarCoberturaOuFalhar(conexao, id, bloquear = false) {
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS_COBERTURA}, t.descricao AS tipo_seguro
       FROM cobertura c JOIN tipo_seguro t ON t.id_tipo_seguro = c.id_tipo_seguro
      WHERE c.id_cobertura = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  if (!linhas[0]) throw AppError.naoEncontrado('Cobertura não encontrada.');
  return ativoBool(linhas[0]);
}

async function conferirDescricaoTipo(conexao, descricao, idAtual) {
  const [l] = await conexao.query(
    'SELECT 1 FROM tipo_seguro WHERE descricao = ? AND id_tipo_seguro <> ?', [descricao, idAtual || 0]);
  if (l.length) throw AppError.campos({ descricao: 'Já existe um tipo de seguro com esta descrição.' });
}

async function conferirDescricaoCobertura(conexao, idTipo, descricao, idAtual, campo = 'descricao') {
  const [l] = await conexao.query(
    'SELECT 1 FROM cobertura WHERE id_tipo_seguro = ? AND descricao = ? AND id_cobertura <> ?',
    [idTipo, descricao, idAtual || 0]);
  if (l.length) throw AppError.campos({ [campo]: 'Este tipo já tem uma cobertura com esta descrição.' });
}

const registrarNoTipo = (conexao, idUsuario, idTipo, evento) =>
  Historico.registrar(conexao, { idUsuario, entidade: 'tipo_seguro', idRegistro: idTipo, ...evento });

// ---------------------------------------------------------------
// Tipos de seguro
// ---------------------------------------------------------------

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];
  if (filtros.busca) {
    const termo = `%${String(filtros.busca).trim()}%`;
    condicoes.push(`(t.descricao LIKE ? OR EXISTS (SELECT 1 FROM cobertura c
                       WHERE c.id_tipo_seguro = t.id_tipo_seguro AND c.descricao LIKE ?))`);
    valores.push(termo, termo);
  }
  if (filtros.situacao === 'ativo') condicoes.push('t.ativo = TRUE');
  if (filtros.situacao === 'inativo') condicoes.push('t.ativo = FALSE');
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS_TIPO} FROM tipo_seguro t
      ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
      ORDER BY t.ativo DESC, t.descricao`, valores);
  return comCoberturas(pool, linhas.map(ativoBool));
}

async function buscar(id) {
  const [tipo] = await comCoberturas(pool, [await buscarTipoOuFalhar(pool, id)]);
  return tipo;
}

// Inclusão do tipo, opcionalmente já com as primeiras coberturas
async function incluir(dados, idUsuario) {
  return comTransacao(async (conexao) => {
    await conferirDescricaoTipo(conexao, dados.descricao, null);
    const [r] = await conexao.query('INSERT INTO tipo_seguro (descricao) VALUES (?)', [dados.descricao]);
    for (const descricao of dados.coberturas || []) {
      await conexao.query('INSERT INTO cobertura (id_tipo_seguro, descricao) VALUES (?, ?)', [r.insertId, descricao]);
    }
    await registrarNoTipo(conexao, idUsuario, r.insertId, {
      tipo: 'criacao', descricao: `Tipo de seguro ${dados.descricao} cadastrado`,
      depois: { descricao: dados.descricao, coberturas: dados.coberturas || [] }
    });
    const [tipo] = await comCoberturas(conexao, [await buscarTipoOuFalhar(conexao, r.insertId)]);
    return tipo;
  });
}

async function alterar(id, dados, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarTipoOuFalhar(conexao, id, true);
    await conferirDescricaoTipo(conexao, dados.descricao, id);
    await conexao.query('UPDATE tipo_seguro SET descricao = ? WHERE id_tipo_seguro = ?', [dados.descricao, id]);
    await registrarNoTipo(conexao, idUsuario, id, {
      tipo: 'correcao', descricao: `Tipo de seguro ${dados.descricao}: descrição corrigida`,
      antes: { descricao: atual.descricao }, depois: { descricao: dados.descricao }
    });
    const [tipo] = await comCoberturas(conexao, [await buscarTipoOuFalhar(conexao, id)]);
    return tipo;
  });
}

async function inativar(id, evento, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarTipoOuFalhar(conexao, id, true);
    if (!atual.ativo) throw AppError.conflito('Este tipo de seguro já está inativo.');
    await conexao.query('UPDATE tipo_seguro SET ativo = FALSE WHERE id_tipo_seguro = ?', [id]);
    await registrarNoTipo(conexao, idUsuario, id, {
      tipo: 'inativacao', dataEvento: evento.data_efetiva, motivo: evento.motivo,
      descricao: `Tipo de seguro ${atual.descricao} inativado`, antes: { ativo: true }, depois: { ativo: false }
    });
    return buscarTipoOuFalhar(conexao, id);
  });
}

async function reativar(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarTipoOuFalhar(conexao, id, true);
    if (atual.ativo) throw AppError.conflito('Este tipo de seguro já está ativo.');
    await conexao.query('UPDATE tipo_seguro SET ativo = TRUE WHERE id_tipo_seguro = ?', [id]);
    await registrarNoTipo(conexao, idUsuario, id, {
      tipo: 'reativacao', descricao: `Tipo de seguro ${atual.descricao} reativado`,
      antes: { ativo: false }, depois: { ativo: true }
    });
    return buscarTipoOuFalhar(conexao, id);
  });
}

// Excluir o tipo leva junto as coberturas dele, desde que nenhuma esteja em uso
async function excluir(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarTipoOuFalhar(conexao, id, true);
    await bloquearExclusaoComVinculos(conexao, VINCULOS_TIPO, id, `o tipo ${atual.descricao}`);
    const [coberturas] = await conexao.query('SELECT descricao FROM cobertura WHERE id_tipo_seguro = ?', [id]);
    await conexao.query('DELETE FROM cobertura WHERE id_tipo_seguro = ?', [id]);
    await conexao.query('DELETE FROM tipo_seguro WHERE id_tipo_seguro = ?', [id]);
    await registrarNoTipo(conexao, idUsuario, id, {
      tipo: 'exclusao', descricao: `Tipo de seguro ${atual.descricao} excluído`,
      antes: { descricao: atual.descricao, coberturas: coberturas.map((c) => c.descricao) }
    });
    return { excluido: true };
  });
}

// ---------------------------------------------------------------
// Coberturas
// ---------------------------------------------------------------

async function listarCoberturas(idTipo) {
  await buscarTipoOuFalhar(pool, idTipo);
  return (await coberturasDosTipos(pool, [idTipo])).get(idTipo) || [];
}

async function incluirCobertura(idTipo, descricao, idUsuario) {
  return comTransacao(async (conexao) => {
    const tipo = await buscarTipoOuFalhar(conexao, idTipo, true);
    if (!tipo.ativo) throw AppError.conflito('Este tipo de seguro está inativo; reative-o antes de incluir coberturas.');
    await conferirDescricaoCobertura(conexao, idTipo, descricao, null);
    const [r] = await conexao.query('INSERT INTO cobertura (id_tipo_seguro, descricao) VALUES (?, ?)', [idTipo, descricao]);
    await registrarNoTipo(conexao, idUsuario, idTipo, {
      tipo: 'criacao', descricao: `Cobertura ${descricao} incluída no tipo ${tipo.descricao}`,
      depois: { id_cobertura: r.insertId, descricao }
    });
    return buscarCoberturaOuFalhar(conexao, r.insertId);
  });
}

async function alterarCobertura(id, descricao, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarCoberturaOuFalhar(conexao, id, true);
    await conferirDescricaoCobertura(conexao, atual.id_tipo_seguro, descricao, id);
    await conexao.query('UPDATE cobertura SET descricao = ? WHERE id_cobertura = ?', [descricao, id]);
    await registrarNoTipo(conexao, idUsuario, atual.id_tipo_seguro, {
      tipo: 'correcao', descricao: `Cobertura ${atual.descricao} renomeada para ${descricao} (tipo ${atual.tipo_seguro})`,
      antes: { id_cobertura: id, descricao: atual.descricao }, depois: { id_cobertura: id, descricao }
    });
    return buscarCoberturaOuFalhar(conexao, id);
  });
}

async function inativarCobertura(id, evento, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarCoberturaOuFalhar(conexao, id, true);
    if (!atual.ativo) throw AppError.conflito('Esta cobertura já está inativa.');
    await conexao.query('UPDATE cobertura SET ativo = FALSE WHERE id_cobertura = ?', [id]);
    await registrarNoTipo(conexao, idUsuario, atual.id_tipo_seguro, {
      tipo: 'inativacao', dataEvento: evento.data_efetiva, motivo: evento.motivo,
      descricao: `Cobertura ${atual.descricao} inativada para novos registros (tipo ${atual.tipo_seguro})`,
      antes: { id_cobertura: id, ativo: true }, depois: { id_cobertura: id, ativo: false }
    });
    return buscarCoberturaOuFalhar(conexao, id);
  });
}

async function reativarCobertura(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarCoberturaOuFalhar(conexao, id, true);
    if (atual.ativo) throw AppError.conflito('Esta cobertura já está ativa.');
    await conexao.query('UPDATE cobertura SET ativo = TRUE WHERE id_cobertura = ?', [id]);
    await registrarNoTipo(conexao, idUsuario, atual.id_tipo_seguro, {
      tipo: 'reativacao', descricao: `Cobertura ${atual.descricao} reativada (tipo ${atual.tipo_seguro})`,
      antes: { id_cobertura: id, ativo: false }, depois: { id_cobertura: id, ativo: true }
    });
    return buscarCoberturaOuFalhar(conexao, id);
  });
}

async function excluirCobertura(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarCoberturaOuFalhar(conexao, id, true);
    const vinculos = await contarVinculos(conexao, VINCULOS_COBERTURA, id);
    if (vinculos.length) {
      throw AppError.conflito(
        `A cobertura ${atual.descricao} é usada em ${juntar(vinculos.map((v) => v.texto))} e não pode ser excluída, ` +
        'apenas inativada para novos registros (RN22).', 'CADASTRO_COM_VINCULOS');
    }
    await conexao.query('DELETE FROM cobertura WHERE id_cobertura = ?', [id]);
    await registrarNoTipo(conexao, idUsuario, atual.id_tipo_seguro, {
      tipo: 'exclusao', descricao: `Cobertura ${atual.descricao} excluída do tipo ${atual.tipo_seguro}`,
      antes: { id_cobertura: id, descricao: atual.descricao }
    });
    return { excluida: true };
  });
}

module.exports = {
  listar, buscar, incluir, alterar, inativar, reativar, excluir,
  listarCoberturas, incluirCobertura, alterarCobertura, inativarCobertura, reativarCobertura, excluirCobertura
};
