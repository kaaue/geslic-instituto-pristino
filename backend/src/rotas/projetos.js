// Rotas da RF_B6 - Gerenciar projetos institucionais.
//
// Quem pode o quê (RN21):
//   Operador e Administrador: consultar, incluir, prorrogar o término e encerrar.
//   Somente Administrador: alterar os dados cadastrais e excluir.
// O encerramento é manual e não transfere, renova nem cancela recursos (RN17, RN18).
// A exclusão só vale para projeto sem vínculos (RN22).

const express = require('express');
const pool = require('../banco');
const { exigirAdministrador } = require('../permissoes');
const {
  validarProjeto, validarEncerramento, validarProrrogacao
} = require('../validacaoProjeto');

const rotas = express.Router();

// Antecedência padrão dos avisos de vencimento (RN24): seis meses
const MESES_AVISO = 6;

// As datas saem já como texto AAAA-MM-DD, para não sofrerem ajuste de fuso
// na conversão para JSON.
const COLUNAS = `
    p.id_projeto,
    p.codigo,
    p.nome,
    p.fonte_financiadora,
    p.id_responsavel,
    c.nome AS nome_responsavel,
    DATE_FORMAT(p.data_inicio, '%Y-%m-%d')       AS data_inicio,
    DATE_FORMAT(p.data_fim_prevista, '%Y-%m-%d') AS data_fim_prevista,
    DATE_FORMAT(p.data_encerramento, '%Y-%m-%d') AS data_encerramento,
    p.situacao,
    DATEDIFF(p.data_fim_prevista, CURDATE())     AS dias_para_termino,
    (SELECT COUNT(*) FROM licenca l WHERE l.id_projeto_adquirente = p.id_projeto)
      AS licencas_adquiridas,
    (SELECT COUNT(*) FROM instancia i
      WHERE i.id_projeto_atual = p.id_projeto AND i.situacao = 'ativa')
      AS instancias_responsavel,
    (SELECT COUNT(*) FROM colaborador_projeto cp WHERE cp.id_projeto = p.id_projeto)
      AS participantes`;

const TABELAS = `
    FROM projeto p
    LEFT JOIN colaborador c ON c.id_colaborador = p.id_responsavel`;

// Ano com quatro dígitos e, opcionalmente, o semestre (1 ou 2).
// Sem ano válido, o filtro de período não é aplicado.
function periodoDoFiltro(ano, semestre) {
  if (!/^\d{4}$/.test(ano || '')) return null;
  if (semestre === '1') return { inicio: `${ano}-01-01`, fim: `${ano}-06-30` };
  if (semestre === '2') return { inicio: `${ano}-07-01`, fim: `${ano}-12-31` };
  return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
}

function montarConsulta(filtros) {
  const condicoes = [];
  const valores = [];

  // Busca livre: código, nome ou fonte financiadora
  if (filtros.busca) {
    condicoes.push('(p.codigo LIKE ? OR p.nome LIKE ? OR p.fonte_financiadora LIKE ?)');
    const termo = `%${filtros.busca.trim()}%`;
    valores.push(termo, termo, termo);
  }

  if (filtros.situacao) {
    condicoes.push('p.situacao = ?');
    valores.push(filtros.situacao);
  }

  if (filtros.id_responsavel) {
    condicoes.push('p.id_responsavel = ?');
    valores.push(Number(filtros.id_responsavel));
  }

  if (filtros.fonte) {
    condicoes.push('p.fonte_financiadora = ?');
    valores.push(filtros.fonte);
  }

  // Prazo do término previsto, ligado aos avisos de vencimento
  if (filtros.prazo === 'proximo') {
    condicoes.push(`p.situacao = 'em_andamento'
      AND p.data_fim_prevista >= CURDATE()
      AND p.data_fim_prevista <= DATE_ADD(CURDATE(), INTERVAL ${MESES_AVISO} MONTH)`);
  } else if (filtros.prazo === 'vencido') {
    condicoes.push(`p.situacao = 'em_andamento' AND p.data_fim_prevista < CURDATE()`);
  } else if (filtros.prazo === 'sem_termino') {
    condicoes.push('p.data_fim_prevista IS NULL');
  }

  // Vigente no período: o projeto esteve em andamento em ao menos um dia do
  // ano ou do semestre escolhido. Projeto encerrado vale até o encerramento;
  // em andamento vale até o término previsto ou, se já vencido, até hoje;
  // sem término previsto, não tem fim.
  const periodo = periodoDoFiltro(filtros.ano, filtros.semestre);
  if (periodo) {
    condicoes.push(`p.data_inicio <= ? AND
      CASE WHEN p.situacao = 'encerrado' THEN p.data_encerramento
           WHEN p.data_fim_prevista IS NULL THEN DATE('9999-12-31')
           ELSE GREATEST(p.data_fim_prevista, CURDATE()) END >= ?`);
    valores.push(periodo.fim, periodo.inicio);
  }

  const sql = `SELECT ${COLUNAS} ${TABELAS}
    ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
    ORDER BY p.codigo`;
  return { sql, valores };
}

async function buscarProjeto(conexao, id) {
  const [linhas] = await conexao.query(`SELECT ${COLUNAS} ${TABELAS} WHERE p.id_projeto = ?`, [id]);
  return linhas[0] || null;
}

// Código e nome não podem repetir (RN19). A comparação do nome não diferencia
// maiúsculas e minúsculas por causa da collation do banco, e os espaços extras
// já foram removidos na validação.
async function conferirDuplicidade(conexao, dados, idAtual) {
  const erros = {};
  const [codigo] = await conexao.query(
    'SELECT id_projeto FROM projeto WHERE codigo = ? AND id_projeto <> ?', [dados.codigo, idAtual || 0]);
  if (codigo.length) erros.codigo = 'Já existe um projeto com este código.';
  const [nome] = await conexao.query(
    'SELECT id_projeto FROM projeto WHERE nome = ? AND id_projeto <> ?', [dados.nome, idAtual || 0]);
  if (nome.length) erros.nome = 'Já existe um projeto com este nome.';
  return erros;
}

// O responsável (obrigatório) precisa ser um colaborador ativo
async function conferirResponsavel(conexao, idResponsavel) {
  if (!idResponsavel) return {};
  const [linhas] = await conexao.query(
    'SELECT ativo FROM colaborador WHERE id_colaborador = ?', [idResponsavel]);
  if (!linhas.length || !linhas[0].ativo) {
    return { id_responsavel: 'Selecione um colaborador ativo.' };
  }
  return {};
}

// Participantes: colaboradores já cadastrados. Um colaborador desligado não
// entra como novo participante, mas continua no projeto se já participava.
async function conferirParticipantes(conexao, ids, idProjeto) {
  if (!ids || !ids.length) return {};
  const [linhas] = await conexao.query(
    `SELECT c.id_colaborador, c.nome, c.ativo,
            EXISTS (SELECT 1 FROM colaborador_projeto cp
                     WHERE cp.id_colaborador = c.id_colaborador AND cp.id_projeto = ?) AS ja_participa
       FROM colaborador c
      WHERE c.id_colaborador IN (?)`,
    [idProjeto || 0, ids]);
  if (linhas.length !== ids.length) {
    return { participantes: 'Selecione somente colaboradores cadastrados.' };
  }
  const desligados = linhas.filter((l) => !l.ativo && !l.ja_participa);
  if (desligados.length) {
    return {
      participantes: `Colaborador desligado não pode ser incluído: ${desligados.map((l) => l.nome).join(', ')}.`
    };
  }
  return {};
}

// Substitui as participações do projeto pela lista recebida
async function gravarParticipantes(conexao, idProjeto, ids) {
  await conexao.query('DELETE FROM colaborador_projeto WHERE id_projeto = ?', [idProjeto]);
  if (ids.length) {
    await conexao.query(
      'INSERT INTO colaborador_projeto (id_colaborador, id_projeto) VALUES ?',
      [ids.map((id) => [id, idProjeto])]);
  }
}

async function listarParticipantes(conexao, idProjeto) {
  const [linhas] = await conexao.query(
    `SELECT c.id_colaborador, c.nome, c.cargo, c.ativo, s.nome AS nome_setor
       FROM colaborador_projeto cp
       JOIN colaborador c ON c.id_colaborador = cp.id_colaborador
       JOIN setor s       ON s.id_setor = c.id_setor
      WHERE cp.id_projeto = ?
      ORDER BY c.nome`, [idProjeto]);
  return linhas.map((l) => ({ ...l, ativo: Boolean(l.ativo) }));
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

// Fontes financiadoras já usadas, para o filtro da consulta
rotas.get('/fontes', async (req, res, proximo) => {
  try {
    const [linhas] = await pool.query(
      'SELECT DISTINCT fonte_financiadora FROM projeto ORDER BY fonte_financiadora');
    res.json(linhas.map((l) => l.fonte_financiadora));
  } catch (erro) {
    proximo(erro);
  }
});

rotas.get('/:id', async (req, res, proximo) => {
  try {
    const projeto = await buscarProjeto(pool, Number(req.params.id));
    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });
    res.json({ ...projeto, lista_participantes: await listarParticipantes(pool, projeto.id_projeto) });
  } catch (erro) {
    proximo(erro);
  }
});

// ---------------------------------------------------------------
// Incluir (Operador e Administrador)
// ---------------------------------------------------------------
rotas.post('/', async (req, res, proximo) => {
  const { erros, dados } = validarProjeto(req.body);
  if (Object.keys(erros).length) return res.status(400).json({ erros });

  // Projeto e participações gravados juntos, numa transação
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    const errosBanco = {
      ...(await conferirDuplicidade(conexao, dados, null)),
      ...(await conferirResponsavel(conexao, dados.id_responsavel)),
      ...(await conferirParticipantes(conexao, dados.participantes, null))
    };
    if (Object.keys(errosBanco).length) {
      await conexao.rollback();
      return res.status(400).json({ erros: errosBanco });
    }

    const [resultado] = await conexao.query(
      `INSERT INTO projeto
         (codigo, nome, fonte_financiadora, id_responsavel, data_inicio, data_fim_prevista, situacao)
       VALUES (?, ?, ?, ?, ?, ?, 'em_andamento')`,
      [dados.codigo, dados.nome, dados.fonte_financiadora, dados.id_responsavel,
       dados.data_inicio, dados.data_fim_prevista]
    );
    if (dados.participantes) {
      await gravarParticipantes(conexao, resultado.insertId, dados.participantes);
    }

    await conexao.commit();
    res.status(201).json({ id_projeto: resultado.insertId });
  } catch (erro) {
    await conexao.rollback();
    // Se duas pessoas gravarem o mesmo código ao mesmo tempo, o UNIQUE do banco segura
    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ erros: { codigo: 'Código ou nome já cadastrado.' } });
    }
    proximo(erro);
  } finally {
    conexao.release();
  }
});

// ---------------------------------------------------------------
// Alterar dados cadastrais (somente Administrador)
// ---------------------------------------------------------------
rotas.put('/:id', exigirAdministrador, async (req, res, proximo) => {
  const id = Number(req.params.id);
  const { erros, dados } = validarProjeto(req.body);
  if (Object.keys(erros).length) return res.status(400).json({ erros });

  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();

    const atual = await buscarProjeto(conexao, id);
    if (!atual) {
      await conexao.rollback();
      return res.status(404).json({ mensagem: 'Projeto não encontrado.' });
    }

    // O responsável que já estava no projeto pode ter sido desligado depois;
    // nesse caso ele pode ser mantido, mas não escolhido de novo.
    const errosBanco = {
      ...(await conferirDuplicidade(conexao, dados, id)),
      ...(dados.id_responsavel === atual.id_responsavel
        ? {} : await conferirResponsavel(conexao, dados.id_responsavel)),
      ...(await conferirParticipantes(conexao, dados.participantes, id))
    };
    // Projeto encerrado: o início não pode passar da data de encerramento
    if (atual.data_encerramento && dados.data_inicio > atual.data_encerramento) {
      errosBanco.data_inicio = 'O início não pode ser posterior ao encerramento do projeto.';
    }
    if (Object.keys(errosBanco).length) {
      await conexao.rollback();
      return res.status(400).json({ erros: errosBanco });
    }

    await conexao.query(
      `UPDATE projeto
          SET codigo = ?, nome = ?, fonte_financiadora = ?, id_responsavel = ?,
              data_inicio = ?, data_fim_prevista = ?
        WHERE id_projeto = ?`,
      [dados.codigo, dados.nome, dados.fonte_financiadora, dados.id_responsavel,
       dados.data_inicio, dados.data_fim_prevista, id]
    );
    if (dados.participantes) {
      await gravarParticipantes(conexao, id, dados.participantes);
    }

    await conexao.commit();
    res.json({ id_projeto: id });
  } catch (erro) {
    await conexao.rollback();
    if (erro.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ erros: { codigo: 'Código ou nome já cadastrado.' } });
    }
    proximo(erro);
  } finally {
    conexao.release();
  }
});

// ---------------------------------------------------------------
// Prorrogar o término previsto (Operador e Administrador)
// ---------------------------------------------------------------
rotas.post('/:id/prorrogacao', async (req, res, proximo) => {
  const id = Number(req.params.id);
  try {
    const projeto = await buscarProjeto(pool, id);
    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });
    if (projeto.situacao !== 'em_andamento') {
      return res.status(409).json({ mensagem: 'Projeto encerrado não pode ser prorrogado.' });
    }
    const { erros, data } = validarProrrogacao(req.body, projeto);
    if (Object.keys(erros).length) return res.status(400).json({ erros });

    await pool.query('UPDATE projeto SET data_fim_prevista = ? WHERE id_projeto = ?', [data, id]);
    res.json({ id_projeto: id, data_fim_prevista: data });
  } catch (erro) {
    proximo(erro);
  }
});

// ---------------------------------------------------------------
// Encerrar (Operador e Administrador). Encerramento manual (RN17): não
// transfere, renova nem cancela licenças, instâncias ou apólices (RN18).
// ---------------------------------------------------------------
rotas.post('/:id/encerramento', async (req, res, proximo) => {
  const id = Number(req.params.id);
  try {
    const projeto = await buscarProjeto(pool, id);
    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });
    if (projeto.situacao === 'encerrado') {
      return res.status(409).json({ mensagem: 'Este projeto já está encerrado.' });
    }
    const { erros, data } = validarEncerramento(req.body, projeto);
    if (Object.keys(erros).length) return res.status(400).json({ erros });

    await pool.query(
      `UPDATE projeto SET situacao = 'encerrado', data_encerramento = ? WHERE id_projeto = ?`,
      [data, id]);
    res.json({
      id_projeto: id,
      data_encerramento: data,
      licencas_vinculadas: projeto.licencas_adquiridas,
      instancias_vinculadas: projeto.instancias_responsavel
    });
  } catch (erro) {
    proximo(erro);
  }
});

// ---------------------------------------------------------------
// Excluir (somente Administrador, e só sem vínculos - RN22)
// ---------------------------------------------------------------
rotas.delete('/:id', exigirAdministrador, async (req, res, proximo) => {
  const id = Number(req.params.id);
  try {
    const projeto = await buscarProjeto(pool, id);
    if (!projeto) return res.status(404).json({ mensagem: 'Projeto não encontrado.' });

    const vinculos = [];
    if (projeto.licencas_adquiridas) vinculos.push(`${projeto.licencas_adquiridas} licença(s) adquirida(s)`);
    if (projeto.instancias_responsavel) vinculos.push(`${projeto.instancias_responsavel} instância(s) sob sua responsabilidade`);
    if (projeto.participantes) vinculos.push(`${projeto.participantes} colaborador(es) participante(s)`);
    // instâncias inativas também são vínculo histórico
    const [inativas] = await pool.query(
      `SELECT COUNT(*) AS total FROM instancia WHERE id_projeto_atual = ? AND situacao = 'inativa'`, [id]);
    if (inativas[0].total) vinculos.push(`${inativas[0].total} instância(s) inativa(s) no histórico`);

    if (vinculos.length) {
      return res.status(409).json({
        mensagem: `O projeto ${projeto.codigo} possui vínculos (${vinculos.join(', ')}) e não pode ser excluído. ` +
                  'Para tirá-lo de uso, encerre o projeto.'
      });
    }

    await pool.query('DELETE FROM projeto WHERE id_projeto = ?', [id]);
    res.json({ excluido: true });
  } catch (erro) {
    proximo(erro);
  }
});

module.exports = rotas;
