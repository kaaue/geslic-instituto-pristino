// Model da RF_F1 - Gerenciar projetos institucionais: acesso ao banco e
// regras dos dados.
//
// O encerramento é manual e não transfere, renova nem cancela recursos (RN17, RN18).
// Projeto não é excluído: sai de uso pelo encerramento e pode ser reaberto,
// com os dois eventos preservados no histórico.
// O responsável sempre consta entre os participantes.
// Quem pode cada operação (RN21) é decidido nas rotas, pelas permissões.
// Cada escrita registra no histórico (RF_F14) a conta responsável.

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const { lancarSeHouverErros } = require('../utils/AppError');
const { validarEncerramento, validarProrrogacao } = require('./projetoValidacao');
const Historico = require('./historicoModel');
const { nomesSetoresSql } = require('./colaboradorSetor');

// Campos que o histórico guarda antes e depois de cada alteração
function retrato(p, participantes) {
  return {
    codigo: p.codigo, nome: p.nome, fonte_financiadora: p.fonte_financiadora,
    id_responsavel: p.id_responsavel, id_setor: p.id_setor ?? null, data_inicio: p.data_inicio,
    data_fim_prevista: p.data_fim_prevista, data_encerramento: p.data_encerramento ?? null,
    situacao: p.situacao ?? 'em_andamento',
    ...(participantes && { participantes })
  };
}

async function idsParticipantes(conexao, idProjeto) {
  const [linhas] = await conexao.query(
    'SELECT id_colaborador FROM colaborador_projeto WHERE id_projeto = ? ORDER BY id_colaborador', [idProjeto]);
  return linhas.map((l) => l.id_colaborador);
}

// Antecedência padrão dos avisos de vencimento (RN24): seis meses
const MESES_AVISO = 6;

const NAO_ENCONTRADO = 'Projeto não encontrado.';

// As datas saem já como texto AAAA-MM-DD, para não sofrerem ajuste de fuso
// na conversão para JSON.
const COLUNAS = `
    p.id_projeto,
    p.codigo,
    p.nome,
    p.fonte_financiadora,
    p.id_responsavel,
    c.nome AS nome_responsavel,
    p.id_setor,
    st.nome AS nome_setor,
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
    LEFT JOIN colaborador c ON c.id_colaborador = p.id_responsavel
    LEFT JOIN setor st      ON st.id_setor = p.id_setor`;

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

  // Setor responsável do projeto (RN43); "sem" lista os que ainda não têm
  if (filtros.id_setor === 'sem') {
    condicoes.push('p.id_setor IS NULL');
  } else if (filtros.id_setor) {
    condicoes.push('p.id_setor = ?');
    valores.push(Number(filtros.id_setor));
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

// Busca o projeto ou lança 404. `conexao` pode ser o pool ou a conexão de uma transação.
async function buscarOuFalhar(conexao, id) {
  const [linhas] = await conexao.query(`SELECT ${COLUNAS} ${TABELAS} WHERE p.id_projeto = ?`, [id]);
  if (!linhas[0]) throw AppError.naoEncontrado(NAO_ENCONTRADO);
  return linhas[0];
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

// Setor responsável (opcional): precisa existir e, para vínculo novo, estar ativo
async function conferirSetor(conexao, idSetor, idSetorAtual) {
  if (!idSetor || idSetor === idSetorAtual) return {};
  const [[setor]] = await conexao.query('SELECT ativo FROM setor WHERE id_setor = ?', [idSetor]);
  if (!setor || !setor.ativo) return { id_setor: 'Selecione um setor ativo.' };
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

// O responsável entra entre os participantes, sem repetir (a troca de
// responsável não tira o anterior da lista)
function comResponsavel(ids, idResponsavel) {
  const lista = [...new Set((ids || []).map(Number))];
  if (idResponsavel && !lista.includes(Number(idResponsavel))) lista.push(Number(idResponsavel));
  return lista;
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
    `SELECT c.id_colaborador, c.nome, c.cargo, c.ativo, ${nomesSetoresSql('c')} AS nome_setor
       FROM colaborador_projeto cp
       JOIN colaborador c ON c.id_colaborador = cp.id_colaborador
      WHERE cp.id_projeto = ?
      ORDER BY c.nome`, [idProjeto]);
  return linhas.map((l) => ({ ...l, ativo: Boolean(l.ativo) }));
}

// Se duas pessoas gravarem o mesmo código ao mesmo tempo, o UNIQUE do banco
// segura; aqui o erro do banco vira erro de campo.
function traduzirDuplicidade(erro) {
  if (erro.code === 'ER_DUP_ENTRY') {
    return AppError.campos({ codigo: 'Código ou nome já cadastrado.' });
  }
  return erro;
}

// ---------------------------------------------------------------
// Operações
// ---------------------------------------------------------------

async function listar(filtros) {
  const { sql, valores } = montarConsulta(filtros);
  const [linhas] = await pool.query(sql, valores);
  return linhas;
}

// Fontes financiadoras já usadas, para o filtro da consulta
async function listarFontes() {
  const [linhas] = await pool.query(
    'SELECT DISTINCT fonte_financiadora FROM projeto ORDER BY fonte_financiadora');
  return linhas.map((l) => l.fonte_financiadora);
}

// Anos em que ao menos um projeto esteve em andamento, para a lista do
// filtro "Vigente em". O fim de cada projeto segue a mesma regra do filtro:
// encerrado vale até o encerramento; em andamento vale até o término
// previsto ou, se já vencido, até hoje; sem término previsto, até hoje.
async function listarAnos() {
  const [linhas] = await pool.query(
    `SELECT YEAR(data_inicio) AS ano_inicio,
            YEAR(CASE WHEN situacao = 'encerrado' THEN data_encerramento
                      WHEN data_fim_prevista IS NULL THEN CURDATE()
                      ELSE GREATEST(data_fim_prevista, CURDATE()) END) AS ano_fim
       FROM projeto`);

  // Junta os anos de todos os projetos, sem repetir
  const anos = new Set();
  linhas.forEach((l) => {
    for (let ano = l.ano_inicio; ano <= l.ano_fim; ano += 1) anos.add(ano);
  });

  // Mais recente primeiro, que é o ano mais procurado
  return [...anos].sort((a, b) => b - a);
}

// Um projeto, com a lista dos colaboradores participantes
async function buscarComParticipantes(id) {
  const projeto = await buscarOuFalhar(pool, id);
  return { ...projeto, lista_participantes: await listarParticipantes(pool, projeto.id_projeto) };
}

// Projeto e participações gravados juntos, numa transação
async function incluir(dados, idResponsavel) {
  dados = { ...dados, participantes: comResponsavel(dados.participantes, dados.id_responsavel) };
  try {
    return await comTransacao(async (conexao) => {
      lancarSeHouverErros({
        ...(await conferirDuplicidade(conexao, dados, null)),
        ...(await conferirResponsavel(conexao, dados.id_responsavel)),
        ...(await conferirSetor(conexao, dados.id_setor, null)),
        ...(await conferirParticipantes(conexao, dados.participantes, null))
      });

      const [resultado] = await conexao.query(
        `INSERT INTO projeto
           (codigo, nome, fonte_financiadora, id_responsavel, id_setor, data_inicio, data_fim_prevista, situacao)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'em_andamento')`,
        [dados.codigo, dados.nome, dados.fonte_financiadora, dados.id_responsavel, dados.id_setor,
         dados.data_inicio, dados.data_fim_prevista]
      );
      await gravarParticipantes(conexao, resultado.insertId, dados.participantes);
      await Historico.registrar(conexao, {
        idUsuario: idResponsavel, tipo: 'criacao', entidade: 'projeto', idRegistro: resultado.insertId,
        descricao: `Projeto ${dados.codigo} · ${dados.nome} cadastrado`,
        depois: retrato(dados, dados.participantes || [])
      });
      return { id_projeto: resultado.insertId };
    });
  } catch (erro) {
    throw traduzirDuplicidade(erro);
  }
}

// Correção dos dados cadastrais (exclusiva do Administrador, RN21)
async function alterar(id, dados, idResponsavel) {
  try {
    return await comTransacao(async (conexao) => {
      const atual = await buscarOuFalhar(conexao, id);
      const participantesAntes = await idsParticipantes(conexao, id);
      dados = {
        ...dados,
        participantes: comResponsavel(dados.participantes ?? participantesAntes, dados.id_responsavel)
      };

      // O responsável que já estava no projeto pode ter sido desligado depois;
      // nesse caso ele pode ser mantido, mas não escolhido de novo.
      const erros = {
        ...(await conferirDuplicidade(conexao, dados, id)),
        ...(dados.id_responsavel === atual.id_responsavel
          ? {} : await conferirResponsavel(conexao, dados.id_responsavel)),
        ...(await conferirSetor(conexao, dados.id_setor, atual.id_setor)),
        ...(await conferirParticipantes(conexao, dados.participantes, id))
      };
      // Projeto encerrado: o início não pode passar da data de encerramento
      if (atual.data_encerramento && dados.data_inicio > atual.data_encerramento) {
        erros.data_inicio = 'O início não pode ser posterior ao encerramento do projeto.';
      }
      lancarSeHouverErros(erros);

      await conexao.query(
        `UPDATE projeto
            SET codigo = ?, nome = ?, fonte_financiadora = ?, id_responsavel = ?, id_setor = ?,
                data_inicio = ?, data_fim_prevista = ?
          WHERE id_projeto = ?`,
        [dados.codigo, dados.nome, dados.fonte_financiadora, dados.id_responsavel, dados.id_setor,
         dados.data_inicio, dados.data_fim_prevista, id]
      );
      await gravarParticipantes(conexao, id, dados.participantes);
      await Historico.registrar(conexao, {
        idUsuario: idResponsavel, tipo: 'correcao', entidade: 'projeto', idRegistro: id,
        descricao: `Projeto ${dados.codigo} · ${dados.nome}: dados corrigidos`,
        antes: retrato(atual, participantesAntes),
        depois: retrato({ ...atual, ...dados }, await idsParticipantes(conexao, id))
      });
      return { id_projeto: id };
    });
  } catch (erro) {
    throw traduzirDuplicidade(erro);
  }
}

// Prorrogar o término previsto: só projeto em andamento. Ação operacional,
// permitida ao Operador (projeto.prorrogar), embora grave um UPDATE.
async function prorrogar(id, corpo, idResponsavel) {
  return comTransacao(async (conexao) => {
    const projeto = await buscarOuFalhar(conexao, id);
    if (projeto.situacao !== 'em_andamento') {
      throw AppError.conflito('Projeto encerrado não pode ser prorrogado.');
    }
    const { erros, data } = validarProrrogacao(corpo, projeto);
    lancarSeHouverErros(erros);

    await conexao.query('UPDATE projeto SET data_fim_prevista = ? WHERE id_projeto = ?', [data, id]);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'prorrogacao', entidade: 'projeto', idRegistro: id,
      descricao: `Projeto ${projeto.codigo} · ${projeto.nome}: término previsto prorrogado`,
      antes: { data_fim_prevista: projeto.data_fim_prevista }, depois: { data_fim_prevista: data }
    });
    return { id_projeto: id, data_fim_prevista: data };
  });
}

// Encerramento manual (RN17): não transfere, renova nem cancela licenças,
// instâncias ou apólices (RN18). A resposta informa o que continua vinculado.
// A data efetiva do evento no histórico é a data de encerramento informada.
async function encerrar(id, corpo, idResponsavel) {
  return comTransacao(async (conexao) => {
    const projeto = await buscarOuFalhar(conexao, id);
    if (projeto.situacao === 'encerrado') {
      throw AppError.conflito('Este projeto já está encerrado.');
    }
    const { erros, data } = validarEncerramento(corpo, projeto);
    lancarSeHouverErros(erros);

    await conexao.query(
      `UPDATE projeto SET situacao = 'encerrado', data_encerramento = ? WHERE id_projeto = ?`,
      [data, id]);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'encerramento', entidade: 'projeto', idRegistro: id,
      dataEvento: data,
      descricao: `Projeto ${projeto.codigo} · ${projeto.nome} encerrado; ` +
        `${projeto.licencas_adquiridas} licença(s) e ${projeto.instancias_responsavel} instância(s) mantidas (RN18)`,
      antes: { situacao: projeto.situacao, data_encerramento: null },
      depois: { situacao: 'encerrado', data_encerramento: data }
    });
    return {
      id_projeto: id,
      data_encerramento: data,
      licencas_vinculadas: projeto.licencas_adquiridas,
      instancias_vinculadas: projeto.instancias_responsavel
    };
  });
}

// Reabertura de projeto encerrado: volta a "em andamento" sem alterar as
// datas. O encerramento anterior continua no histórico; a reabertura gera
// um evento próprio, com estado anterior e novo e o motivo informado.
// A resposta traz avisos sobre a vigência e o responsável, para conferência.
async function reabrir(id, corpo, idResponsavel) {
  return comTransacao(async (conexao) => {
    const projeto = await buscarOuFalhar(conexao, id);
    if (projeto.situacao !== 'encerrado') {
      throw AppError.conflito('Somente projeto encerrado pode ser reaberto.');
    }
    const motivo = typeof corpo?.motivo === 'string' ? corpo.motivo.trim().replace(/\s+/g, ' ') : '';
    if (!motivo) lancarSeHouverErros({ motivo: 'Informe o motivo da reabertura.' });
    if (motivo.length > 255) lancarSeHouverErros({ motivo: 'Use no máximo 255 caracteres.' });

    const avisos = [];
    if (projeto.dias_para_termino !== null && projeto.dias_para_termino < 0) {
      avisos.push('O término previsto já passou: prorrogue o projeto se ele continua em execução.');
    }
    const [[resp]] = await conexao.query(
      'SELECT ativo FROM colaborador WHERE id_colaborador = ?', [projeto.id_responsavel]);
    if (!resp || !resp.ativo) avisos.push('O responsável está desligado: indique um novo responsável.');

    await conexao.query(
      `UPDATE projeto SET situacao = 'em_andamento', data_encerramento = NULL WHERE id_projeto = ?`, [id]);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'reabertura', entidade: 'projeto', idRegistro: id,
      descricao: `Projeto ${projeto.codigo} · ${projeto.nome} reaberto`,
      motivo,
      antes: { situacao: 'encerrado', data_encerramento: projeto.data_encerramento },
      depois: { situacao: 'em_andamento', data_encerramento: null }
    });
    return { id_projeto: id, situacao: 'em_andamento', avisos };
  });
}

module.exports = {
  listar, listarFontes, listarAnos, buscarComParticipantes, incluir, alterar, prorrogar, encerrar, reabrir
};
