// Rotas da RF_B3 - Gerenciar equipamentos.
// O equipamento é especialização de bem, então toda escrita mexe em duas tabelas
// dentro de uma transação: ou as duas gravam, ou nenhuma grava.

const express = require('express');
const pool = require('../banco');
const { validarEquipamento } = require('../validacao');

const rotas = express.Router();

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
    ORDER BY e.etiqueta_instituto`;

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

// ---------------------------------------------------------------
// Listar, com filtros
// ---------------------------------------------------------------
rotas.get('/', async (req, res, proximo) => {
  try {
    const { sql, valores } = montarConsulta(req.query);
    const [linhas] = await pool.query(sql, valores);
    res.json(linhas);
  } catch (erro) {
    proximo(erro);
  }
});

// ---------------------------------------------------------------
// Buscar um
// ---------------------------------------------------------------
rotas.get('/:id', async (req, res, proximo) => {
  try {
    const [linhas] = await pool.query(
      `SELECT ${COLUNAS} ${TABELAS} WHERE e.id_equipamento = ?`,
      [Number(req.params.id)]
    );
    if (linhas.length === 0) {
      return res.status(404).json({ mensagem: 'Equipamento não encontrado.' });
    }
    res.json(linhas[0]);
  } catch (erro) {
    proximo(erro);
  }
});

// ---------------------------------------------------------------
// Incluir
// ---------------------------------------------------------------
rotas.post('/', async (req, res, proximo) => {
  const { erros, dados } = validarEquipamento(req.body);
  if (Object.keys(erros).length > 0) {
    return res.status(400).json({ erros });
  }

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    if (await etiquetaEmUso(conexao, 'etiqueta_instituto', dados.etiqueta_instituto, null)) {
      await conexao.rollback();
      return res.status(400).json({
        erros: { etiqueta_instituto: 'Já existe um equipamento com esta etiqueta.' }
      });
    }
    if (await etiquetaEmUso(conexao, 'etiqueta_netscanner', dados.etiqueta_netscanner, null)) {
      await conexao.rollback();
      return res.status(400).json({
        erros: { etiqueta_netscanner: 'Já existe um equipamento com esta etiqueta NetScanner.' }
      });
    }

    // Grava primeiro o bem, depois o equipamento com o mesmo id gerado
    const [resultadoBem] = await conexao.query(
      // patrimonio e valor ficam nulos: a etiqueta do Instituto já identifica
      // o patrimônio do equipamento, e o valor só interessa ao bem segurável
      `INSERT INTO bem (categoria, identificacao, id_setor, situacao)
       VALUES (?, ?, ?, ?)`,
      [dados.categoria, dados.identificacao, dados.id_setor, dados.situacao]
    );
    const novoId = resultadoBem.insertId;

    await conexao.query(
      `INSERT INTO equipamento
        (id_equipamento, etiqueta_instituto, etiqueta_netscanner, tipo, id_responsavel, uso_geral)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [novoId, dados.etiqueta_instituto, dados.etiqueta_netscanner,
       dados.tipo, dados.id_responsavel, dados.uso_geral]
    );

    await conexao.commit();
    res.status(201).json({ id_equipamento: novoId });
  } catch (erro) {
    await conexao.rollback();
    proximo(erro);
  } finally {
    conexao.release();
  }
});

// ---------------------------------------------------------------
// Alterar
// ---------------------------------------------------------------
rotas.put('/:id', async (req, res, proximo) => {
  const id = Number(req.params.id);
  const { erros, dados } = validarEquipamento(req.body);
  if (Object.keys(erros).length > 0) {
    return res.status(400).json({ erros });
  }

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    const [existe] = await conexao.query(
      'SELECT situacao FROM bem WHERE id_bem = ?', [id]);
    if (existe.length === 0) {
      await conexao.rollback();
      return res.status(404).json({ mensagem: 'Equipamento não encontrado.' });
    }

    if (await etiquetaEmUso(conexao, 'etiqueta_instituto', dados.etiqueta_instituto, id)) {
      await conexao.rollback();
      return res.status(400).json({
        erros: { etiqueta_instituto: 'Já existe um equipamento com esta etiqueta.' }
      });
    }
    if (await etiquetaEmUso(conexao, 'etiqueta_netscanner', dados.etiqueta_netscanner, id)) {
      await conexao.rollback();
      return res.status(400).json({
        erros: { etiqueta_netscanner: 'Já existe um equipamento com esta etiqueta NetScanner.' }
      });
    }

    await conexao.query(
      `UPDATE bem
          SET categoria = ?, identificacao = ?, id_setor = ?, situacao = ?
        WHERE id_bem = ?`,
      [dados.categoria, dados.identificacao, dados.id_setor, dados.situacao, id]
    );

    await conexao.query(
      `UPDATE equipamento
          SET etiqueta_instituto = ?, etiqueta_netscanner = ?,
              tipo = ?, id_responsavel = ?, uso_geral = ?
        WHERE id_equipamento = ?`,
      [dados.etiqueta_instituto, dados.etiqueta_netscanner,
       dados.tipo, dados.id_responsavel, dados.uso_geral, id]
    );

    // RN08: inativar equipamento significa descarte. As instâncias não
    // transferíveis alocadas a ele passam a inativas; as transferíveis
    // continuam ativas e podem ser liberadas ou transferidas depois.
    let instanciasInativadas = 0;
    const situacaoAnterior = existe[0].situacao;
    if (situacaoAnterior === 'ativo' && dados.situacao === 'inativo') {
      const [resultado] = await conexao.query(
        `UPDATE instancia i
            JOIN alocacao a ON a.id_instancia = i.id_instancia
            JOIN licenca l  ON l.id_licenca = i.id_licenca
            SET i.situacao = 'inativa',
                i.data_inativacao = CURDATE(),
                i.motivo_inativacao = 'descarte do equipamento'
          WHERE a.id_equipamento = ?
            AND a.data_fim IS NULL
            AND l.transferivel = FALSE
            AND i.situacao = 'ativa'`,
        [id]
      );
      instanciasInativadas = resultado.affectedRows;
    }

    await conexao.commit();
    res.json({ id_equipamento: id, instancias_inativadas: instanciasInativadas });
  } catch (erro) {
    await conexao.rollback();
    proximo(erro);
  } finally {
    conexao.release();
  }
});

// ---------------------------------------------------------------
// Excluir
// Só é permitido excluir cadastro sem vínculos (RN22). Com instância
// alocada, o caminho é inativar o equipamento, não apagar o histórico.
// ---------------------------------------------------------------
rotas.delete('/:id', async (req, res, proximo) => {
  const id = Number(req.params.id);
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    const [vinculos] = await conexao.query(
      'SELECT COUNT(*) AS total FROM alocacao WHERE id_equipamento = ?', [id]);
    if (vinculos[0].total > 0) {
      await conexao.rollback();
      return res.status(409).json({
        mensagem: 'Este equipamento já recebeu licenças e não pode ser excluído. ' +
                  'Para tirá-lo de uso, altere a situação para inativo.'
      });
    }

    // a exclusão em bem remove o equipamento junto, por causa do ON DELETE CASCADE
    const [resultado] = await conexao.query('DELETE FROM bem WHERE id_bem = ?', [id]);
    if (resultado.affectedRows === 0) {
      await conexao.rollback();
      return res.status(404).json({ mensagem: 'Equipamento não encontrado.' });
    }

    await conexao.commit();
    res.json({ excluido: true });
  } catch (erro) {
    await conexao.rollback();
    proximo(erro);
  } finally {
    conexao.release();
  }
});

// ---------------------------------------------------------------
// Prévia da inativação: usada pela interface para avisar o usuário
// antes de confirmar, conforme a RN08.
// ---------------------------------------------------------------
rotas.get('/:id/previa-inativacao', async (req, res, proximo) => {
  try {
    const [linhas] = await pool.query(
      `SELECT l.nome_software, l.transferivel, i.identificacao
         FROM alocacao a
         JOIN instancia i ON i.id_instancia = a.id_instancia
         JOIN licenca l   ON l.id_licenca = i.id_licenca
        WHERE a.id_equipamento = ? AND a.data_fim IS NULL`,
      [Number(req.params.id)]
    );
    res.json({
      nao_transferiveis: linhas.filter((l) => !l.transferivel),
      transferiveis: linhas.filter((l) => l.transferivel)
    });
  } catch (erro) {
    proximo(erro);
  }
});

module.exports = rotas;
