// Model da RF_B3 - Gerenciar equipamentos: acesso ao banco e regras dos dados.
// O equipamento é especialização de bem, então toda escrita mexe em duas tabelas
// dentro de uma transação: ou as duas gravam, ou nenhuma grava. Cada escrita
// registra no histórico (RF_F14) a conta responsável.
//
// Inativar significa descarte (RN08) e exige data efetiva e motivo (RN37): a
// data efetiva fica no bem e no evento do histórico, separada da data e da
// hora do registro, geradas pelo sistema.

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const Historico = require('./historicoModel');
const { lerDataEfetiva, lerMotivo } = require('../utils/normalizacao');

// Colunas devolvidas na listagem e na busca por id.
// Junta bem, equipamento, setor e colaborador, e conta quantas instâncias de
// licença estão alocadas ao equipamento neste momento (alocação com data_fim nula).
const COLUNAS = `
    e.id_equipamento,
    e.etiqueta_instituto,
    e.etiqueta_netscanner,
    e.tipo,
    e.uso_geral,
    e.id_responsavel,
    c.nome AS nome_responsavel,
    b.categoria,
    b.identificacao,
    b.situacao,
    DATE_FORMAT(b.data_inativacao, '%Y-%m-%d') AS data_inativacao,
    b.id_setor,
    s.nome AS nome_setor,
    (SELECT COUNT(*) FROM alocacao a
      WHERE a.id_equipamento = e.id_equipamento AND a.data_fim IS NULL)
      AS instancias_alocadas`;

const TABELAS = `
    FROM equipamento e
    JOIN bem b              ON b.id_bem = e.id_equipamento
    JOIN setor s            ON s.id_setor = b.id_setor
    LEFT JOIN colaborador c ON c.id_colaborador = e.id_responsavel`;

const NAO_ENCONTRADO = 'Equipamento não encontrado.';

// Monta a consulta da listagem aplicando só os filtros que vieram preenchidos.
// Os valores vão como parâmetros (?) e nunca concatenados, para evitar injeção de SQL.
function montarConsulta(filtros) {
  const condicoes = [];
  const valores = [];

  // Busca livre: etiqueta, identificação ou tipo
  if (filtros.busca) {
    condicoes.push(`(
      e.etiqueta_instituto LIKE ? OR
      e.etiqueta_netscanner LIKE ? OR
      b.identificacao LIKE ? OR
      e.tipo LIKE ?
    )`);
    const termo = `%${filtros.busca.trim()}%`;
    valores.push(termo, termo, termo, termo);
  }

  if (filtros.id_setor) {
    condicoes.push('b.id_setor = ?');
    valores.push(Number(filtros.id_setor));
  }

  if (filtros.situacao) {
    condicoes.push('b.situacao = ?');
    valores.push(filtros.situacao);
  }

  // O filtro de uso geral chega como texto 'sim' ou 'nao'
  if (filtros.uso_geral === 'sim') {
    condicoes.push('e.uso_geral = TRUE');
  } else if (filtros.uso_geral === 'nao') {
    condicoes.push('e.uso_geral = FALSE');
  }

  const sql = `SELECT ${COLUNAS} ${TABELAS}
    ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
    ORDER BY b.situacao = 'inativo', e.etiqueta_instituto`;

  return { sql, valores };
}

// Verifica se a etiqueta já pertence a outro equipamento.
// idAtual é passado na edição, para o próprio registro não acusar duplicidade.
async function etiquetaEmUso(conexao, coluna, valor, idAtual) {
  if (!valor) return false;
  const [linhas] = await conexao.query(
    `SELECT id_equipamento FROM equipamento
      WHERE ${coluna} = ? AND id_equipamento <> ?`,
    [valor, idAtual || 0]
  );
  return linhas.length > 0;
}

// Etiquetas únicas (RN20). Lança o erro no campo correspondente.
async function conferirEtiquetas(conexao, dados, idAtual) {
  if (await etiquetaEmUso(conexao, 'etiqueta_instituto', dados.etiqueta_instituto, idAtual)) {
    throw AppError.campos({ etiqueta_instituto: 'Já existe um equipamento com esta etiqueta.' });
  }
  if (await etiquetaEmUso(conexao, 'etiqueta_netscanner', dados.etiqueta_netscanner, idAtual)) {
    throw AppError.campos({ etiqueta_netscanner: 'Já existe um equipamento com esta etiqueta NetScanner.' });
  }
}

// Busca o equipamento ou lança 404. `conexao` pode ser o pool ou a de uma transação.
async function buscarOuFalhar(conexao, id) {
  const [linhas] = await conexao.query(`SELECT ${COLUNAS} ${TABELAS} WHERE e.id_equipamento = ?`, [id]);
  if (linhas.length === 0) throw AppError.naoEncontrado(NAO_ENCONTRADO);
  return linhas[0];
}

// Campos que o histórico guarda antes e depois de cada alteração
function retrato(e) {
  return {
    etiqueta_instituto: e.etiqueta_instituto, etiqueta_netscanner: e.etiqueta_netscanner,
    identificacao: e.identificacao, tipo: e.tipo, categoria: e.categoria, id_setor: e.id_setor,
    id_responsavel: e.id_responsavel, uso_geral: Boolean(e.uso_geral), situacao: e.situacao,
    data_inativacao: e.data_inativacao || null
  };
}

// RN08: inativar equipamento significa descarte. As instâncias não
// transferíveis alocadas a ele passam a inativas na mesma data efetiva, e os
// vínculos delas (alocação e utilização) se encerram nessa data; as
// transferíveis continuam ativas e podem ser liberadas ou transferidas depois.
async function inativarInstanciasNaoTransferiveis(conexao, id, dataEfetiva) {
  const [instancias] = await conexao.query(
    `SELECT i.id_instancia
       FROM instancia i
       JOIN alocacao a ON a.id_instancia = i.id_instancia
       JOIN licenca l  ON l.id_licenca = i.id_licenca
      WHERE a.id_equipamento = ? AND a.data_fim IS NULL
        AND l.transferivel = FALSE AND i.situacao = 'ativa'
      FOR UPDATE`, [id]);
  const ids = instancias.map((i) => i.id_instancia);
  if (ids.length === 0) return 0;

  await conexao.query(
    `UPDATE instancia SET situacao = 'inativa', data_inativacao = ?, motivo_inativacao = 'descarte do equipamento'
      WHERE id_instancia IN (?)`, [dataEfetiva, ids]);
  // O vínculo termina na data efetiva, nunca antes do seu próprio início
  for (const tabela of ['alocacao', 'utilizacao']) {
    await conexao.query(
      `UPDATE ${tabela} SET data_fim = GREATEST(data_inicio, ?)
        WHERE id_instancia IN (?) AND data_fim IS NULL`, [dataEfetiva, ids]);
  }
  return ids.length;
}

const textoInativacao = (quantidade) => (quantidade
  ? `; ${quantidade} instância(s) não transferível(is) inativada(s) (RN08)` : '');

async function listar(filtros) {
  const { sql, valores } = montarConsulta(filtros);
  const [linhas] = await pool.query(sql, valores);
  return linhas;
}

async function buscar(id) {
  return buscarOuFalhar(pool, id);
}

async function incluir(dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    await conferirEtiquetas(conexao, dados, null);

    // Grava primeiro o bem, depois o equipamento com o mesmo id gerado.
    // Equipamento novo nasce ativo: o descarte é uma ação própria, com data efetiva.
    const [resultadoBem] = await conexao.query(
      // patrimonio e valor ficam nulos: a etiqueta do Instituto já identifica
      // o patrimônio do equipamento, e o valor só interessa ao bem segurável
      `INSERT INTO bem (categoria, identificacao, id_setor, situacao)
       VALUES ('equipamento', ?, ?, 'ativo')`,
      [dados.identificacao, dados.id_setor]
    );
    const novoId = resultadoBem.insertId;

    await conexao.query(
      `INSERT INTO equipamento
        (id_equipamento, etiqueta_instituto, etiqueta_netscanner, tipo, id_responsavel, uso_geral)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [novoId, dados.etiqueta_instituto, dados.etiqueta_netscanner,
       dados.tipo, dados.id_responsavel, dados.uso_geral]
    );

    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'criacao', entidade: 'equipamento', idRegistro: novoId,
      descricao: `Equipamento ${dados.etiqueta_instituto} cadastrado`,
      depois: retrato({ ...dados, categoria: 'equipamento', situacao: 'ativo' })
    });
    return { id_equipamento: novoId };
  });
}

// Correção dos dados cadastrais (exclusiva do Administrador, RN21). A
// situação também pode mudar por aqui: passar a inativo exige data efetiva e
// motivo e aplica a RN08; voltar a ativo é reativação (as instâncias
// inativadas no descarte continuam inativas).
async function alterar(id, dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id);
    await conferirEtiquetas(conexao, dados, id);

    const inativando = atual.situacao === 'ativo' && dados.situacao === 'inativo';
    const reativando = atual.situacao === 'inativo' && dados.situacao === 'ativo';
    let evento = null;
    if (inativando) {
      const erros = {};
      evento = {
        data_efetiva: lerDataEfetiva(dados.data_efetiva, erros),
        motivo: lerMotivo(dados.motivo, erros, { obrigatorio: true })
      };
      if (Object.keys(erros).length) throw AppError.campos(erros);
    }
    const dataInativacao = inativando ? evento.data_efetiva : (reativando ? null : atual.data_inativacao);

    await conexao.query(
      `UPDATE bem SET identificacao = ?, id_setor = ?, situacao = ?, data_inativacao = ?
        WHERE id_bem = ?`,
      [dados.identificacao, dados.id_setor, dados.situacao, dataInativacao, id]
    );

    await conexao.query(
      `UPDATE equipamento
          SET etiqueta_instituto = ?, etiqueta_netscanner = ?,
              tipo = ?, id_responsavel = ?, uso_geral = ?
        WHERE id_equipamento = ?`,
      [dados.etiqueta_instituto, dados.etiqueta_netscanner,
       dados.tipo, dados.id_responsavel, dados.uso_geral, id]
    );

    const instanciasInativadas = inativando
      ? await inativarInstanciasNaoTransferiveis(conexao, id, evento.data_efetiva) : 0;

    await Historico.registrar(conexao, {
      idUsuario: idResponsavel,
      tipo: inativando ? 'inativacao' : (reativando ? 'reativacao' : 'correcao'),
      entidade: 'equipamento', idRegistro: id, dataEvento: evento?.data_efetiva, motivo: evento?.motivo,
      descricao: `Equipamento ${dados.etiqueta_instituto}: dados corrigidos` +
        (inativando ? ' e inativado (descarte)' : '') + (reativando ? ' e reativado' : '') +
        textoInativacao(instanciasInativadas),
      antes: retrato(atual),
      depois: retrato({ ...dados, categoria: atual.categoria, data_inativacao: dataInativacao })
    });
    return { id_equipamento: id, instancias_inativadas: instanciasInativadas };
  });
}

// Inativação (descarte) como ação própria: o Operador inativa sem poder
// alterar os demais dados cadastrais (RN21). Exige data efetiva e motivo
// (RN37) e aplica a RN08.
async function inativar(id, evento, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id);
    if (atual.situacao === 'inativo') throw AppError.conflito('Este equipamento já está inativo.');

    await conexao.query(
      `UPDATE bem SET situacao = 'inativo', data_inativacao = ? WHERE id_bem = ?`, [evento.data_efetiva, id]);
    const instanciasInativadas = await inativarInstanciasNaoTransferiveis(conexao, id, evento.data_efetiva);

    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'inativacao', entidade: 'equipamento', idRegistro: id,
      dataEvento: evento.data_efetiva, motivo: evento.motivo,
      descricao: `Equipamento ${atual.etiqueta_instituto} inativado (descarte)${textoInativacao(instanciasInativadas)}`,
      antes: retrato(atual),
      depois: retrato({ ...atual, situacao: 'inativo', data_inativacao: evento.data_efetiva })
    });
    return { id_equipamento: id, instancias_inativadas: instanciasInativadas };
  });
}

// Reativação pelo Administrador (correção de um descarte registrado por
// engano). As instâncias inativadas no descarte não voltam sozinhas.
async function reativar(id, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id);
    if (atual.situacao === 'ativo') throw AppError.conflito('Este equipamento já está ativo.');
    await conexao.query(`UPDATE bem SET situacao = 'ativo', data_inativacao = NULL WHERE id_bem = ?`, [id]);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'reativacao', entidade: 'equipamento', idRegistro: id,
      descricao: `Equipamento ${atual.etiqueta_instituto} reativado`,
      antes: retrato(atual), depois: retrato({ ...atual, situacao: 'ativo', data_inativacao: null })
    });
    return { id_equipamento: id };
  });
}

// Prévia da inativação: usada pela interface para avisar o usuário antes de
// confirmar, conforme a RN08.
async function previaInativacao(id) {
  await buscarOuFalhar(pool, id);
  const [linhas] = await pool.query(
    `SELECT l.nome_software, l.transferivel, i.identificacao
       FROM alocacao a
       JOIN instancia i ON i.id_instancia = a.id_instancia
       JOIN licenca l   ON l.id_licenca = i.id_licenca
      WHERE a.id_equipamento = ? AND a.data_fim IS NULL AND i.situacao = 'ativa'`,
    [id]
  );
  return {
    nao_transferiveis: linhas.filter((l) => !l.transferivel),
    transferiveis: linhas.filter((l) => l.transferivel)
  };
}

module.exports = { listar, buscar, incluir, alterar, inativar, reativar, previaInativacao };
