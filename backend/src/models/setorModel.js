// Model da RF_B5 - Gerenciar setores.
// Lista inicialmente pré-cadastrada, com inclusão de novos setores. O
// coordenador, quando informado, é um colaborador ativo. A inativação exige
// data efetiva (RN37). Setores com colaboradores, equipamentos, bens ou
// apólices vinculados não podem ser excluídos (RN22).

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const Historico = require('./historicoModel');
const { lerDataEfetiva, lerMotivo } = require('../utils/normalizacao');

const COLUNAS = `
    s.id_setor, s.nome, s.ativo, DATE_FORMAT(s.data_inativacao, '%Y-%m-%d') AS data_inativacao,
    s.id_coordenador, c.nome AS nome_coordenador,
    (SELECT COUNT(*) FROM colaborador_setor cs JOIN colaborador x ON x.id_colaborador = cs.id_colaborador
      WHERE cs.id_setor = s.id_setor AND x.ativo = TRUE) AS colaboradores,
    (SELECT COUNT(*) FROM bem b JOIN equipamento e ON e.id_equipamento = b.id_bem
      WHERE b.id_setor = s.id_setor AND b.situacao = 'ativo') AS equipamentos,
    (SELECT COUNT(*) FROM bem b LEFT JOIN equipamento e ON e.id_equipamento = b.id_bem
      WHERE b.id_setor = s.id_setor AND b.situacao = 'ativo' AND e.id_equipamento IS NULL) AS bens`;

const TABELAS = `
    FROM setor s
    LEFT JOIN colaborador c ON c.id_colaborador = s.id_coordenador`;

const publico = (l) => l && { ...l, ativo: Boolean(l.ativo) };

function retrato(s) {
  return {
    nome: s.nome, id_coordenador: s.id_coordenador ?? null,
    ativo: s.ativo === undefined ? true : Boolean(s.ativo), data_inativacao: s.data_inativacao || null
  };
}

async function buscarOuFalhar(conexao, id, bloquear = false) {
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS} ${TABELAS} WHERE s.id_setor = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  if (!linhas[0]) throw AppError.naoEncontrado('Setor não encontrado.');
  return publico(linhas[0]);
}

async function conferirNome(conexao, nome, idAtual) {
  const [linhas] = await conexao.query('SELECT 1 FROM setor WHERE nome = ? AND id_setor <> ?', [nome, idAtual || 0]);
  if (linhas.length) throw AppError.campos({ nome: 'Já existe um setor com este nome.' });
}

// Coordenador: colaborador ativo (o já definido pode continuar, mesmo que a
// situação dele mude depois; o desligamento retira a coordenação)
async function conferirCoordenador(conexao, idColaborador, idAtual) {
  if (!idColaborador || idColaborador === idAtual) return;
  const [[colaborador]] = await conexao.query('SELECT ativo FROM colaborador WHERE id_colaborador = ?', [idColaborador]);
  if (!colaborador) throw AppError.campos({ id_coordenador: 'Colaborador não encontrado.' });
  if (!colaborador.ativo) throw AppError.campos({ id_coordenador: 'O coordenador precisa ser um colaborador ativo.' });
}

async function listarAtivos() {
  const [linhas] = await pool.query(
    'SELECT id_setor, nome FROM setor WHERE ativo = TRUE ORDER BY nome');
  return linhas;
}

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];
  if (filtros.busca) {
    condicoes.push('(s.nome LIKE ? OR c.nome LIKE ?)');
    const termo = `%${String(filtros.busca).trim()}%`;
    valores.push(termo, termo);
  }
  if (filtros.situacao === 'ativo') condicoes.push('s.ativo = TRUE');
  if (filtros.situacao === 'inativo') condicoes.push('s.ativo = FALSE');
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} ${TABELAS}
      ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
      ORDER BY s.ativo DESC, s.nome`, valores);
  return linhas.map(publico);
}

async function buscar(id) {
  return buscarOuFalhar(pool, id);
}

async function incluir(dados, idUsuario) {
  return comTransacao(async (conexao) => {
    await conferirNome(conexao, dados.nome, null);
    await conferirCoordenador(conexao, dados.id_coordenador, null);
    const [r] = await conexao.query('INSERT INTO setor (nome, id_coordenador) VALUES (?, ?)', [dados.nome, dados.id_coordenador]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'criacao', entidade: 'setor', idRegistro: r.insertId,
      descricao: `Setor ${dados.nome} cadastrado`, depois: retrato(dados)
    });
    return buscarOuFalhar(conexao, r.insertId);
  });
}

// Correção pelo Administrador, inclusive a situação (Protótipo 9): passar a
// inativo exige data efetiva; voltar a ativo limpa a data
async function alterar(id, dados, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    await conferirNome(conexao, dados.nome, id);
    await conferirCoordenador(conexao, dados.id_coordenador, atual.id_coordenador);

    const situacao = dados.situacao || (atual.ativo ? 'ativo' : 'inativo');
    const inativando = atual.ativo && situacao === 'inativo';
    const reativando = !atual.ativo && situacao === 'ativo';
    let evento = {};
    if (inativando) {
      const erros = {};
      evento = { data_efetiva: lerDataEfetiva(dados.data_efetiva, erros), motivo: lerMotivo(dados.motivo, erros) };
      if (Object.keys(erros).length) throw AppError.campos(erros);
    }
    const ativo = situacao === 'ativo';
    const dataInativacao = inativando ? evento.data_efetiva : (ativo ? null : atual.data_inativacao);

    await conexao.query(
      'UPDATE setor SET nome = ?, id_coordenador = ?, ativo = ?, data_inativacao = ? WHERE id_setor = ?',
      [dados.nome, dados.id_coordenador, ativo, dataInativacao, id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: inativando ? 'inativacao' : (reativando ? 'reativacao' : 'correcao'),
      entidade: 'setor', idRegistro: id, dataEvento: evento.data_efetiva, motivo: evento.motivo,
      descricao: `Setor ${dados.nome}: dados corrigidos${inativando ? ' e inativado' : ''}${reativando ? ' e reativado' : ''}`,
      antes: retrato(atual),
      depois: retrato({ ...dados, ativo, data_inativacao: dataInativacao })
    });
    return buscarOuFalhar(conexao, id);
  });
}

async function inativar(id, evento, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    if (!atual.ativo) throw AppError.conflito('Este setor já está inativo.');
    await conexao.query('UPDATE setor SET ativo = FALSE, data_inativacao = ? WHERE id_setor = ?', [evento.data_efetiva, id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'inativacao', entidade: 'setor', idRegistro: id,
      dataEvento: evento.data_efetiva, motivo: evento.motivo,
      descricao: `Setor ${atual.nome} inativado`,
      antes: retrato(atual), depois: retrato({ ...atual, ativo: false, data_inativacao: evento.data_efetiva })
    });
    return buscarOuFalhar(conexao, id);
  });
}

async function reativar(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    if (atual.ativo) throw AppError.conflito('Este setor já está ativo.');
    await conexao.query('UPDATE setor SET ativo = TRUE, data_inativacao = NULL WHERE id_setor = ?', [id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'reativacao', entidade: 'setor', idRegistro: id,
      descricao: `Setor ${atual.nome} reativado`,
      antes: retrato(atual), depois: retrato({ ...atual, ativo: true, data_inativacao: null })
    });
    return buscarOuFalhar(conexao, id);
  });
}

// Só id e nome dos setores ativos (lista pública da solicitação de acesso)
async function listarNomesAtivos() {
  const [linhas] = await pool.query('SELECT id_setor, nome FROM setor WHERE ativo = TRUE ORDER BY nome');
  return linhas;
}

module.exports = { listarNomesAtivos, listarAtivos, listar, buscar, incluir, alterar, inativar, reativar };
