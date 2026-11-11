// Model da RF_B6 - Gerenciar bens seguráveis.
//
// Bens que podem ser cobertos por apólices, com campos comuns, específicos
// por categoria e opcionais (RN20). O bem não tem campo de projeto: as
// apólices que o cobrem e os projetos que financiam essas vigências aparecem
// na listagem e na consulta, inclusive quando há vários (RN40). Não exige
// etiqueta do Instituto.
//
// Equipamentos (RF_B3) também são bens e aparecem aqui, para poderem ser
// segurados sem novo cadastro; inativação e exclusão deles seguem pelo
// cadastro de Equipamentos, por causa da RN08.

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const Historico = require('./historicoModel');

const COLUNAS = `
    b.id_bem, b.categoria, b.identificacao, b.patrimonio, b.placa, b.numero_serie, b.endereco,
    b.renavam, b.ano_modelo, b.matricula, b.area_construida_m2, b.valor, b.id_setor,
    s.nome AS nome_setor, b.situacao, DATE_FORMAT(b.data_inativacao, '%Y-%m-%d') AS data_inativacao,
    e.etiqueta_instituto`;

const TABELAS = `
    FROM bem b
    LEFT JOIN setor s       ON s.id_setor = b.id_setor
    LEFT JOIN equipamento e ON e.id_equipamento = b.id_bem`;

const ROTULO_CATEGORIA = { veiculo: 'Veículo', imovel: 'Imóvel', drone: 'Drone', equipamento: 'Equipamento', outro: 'Outro' };

function publico(linha) {
  if (!linha) return null;
  const { etiqueta_instituto: etiqueta, ...resto } = linha;
  return { ...resto, e_equipamento: Boolean(etiqueta), etiqueta_instituto: etiqueta || null };
}

const nomeDoBem = (b) => `${ROTULO_CATEGORIA[b.categoria] || 'Bem'} ${b.identificacao}`;

function retrato(b) {
  return {
    categoria: b.categoria, identificacao: b.identificacao, patrimonio: b.patrimonio, placa: b.placa,
    numero_serie: b.numero_serie, endereco: b.endereco, renavam: b.renavam, ano_modelo: b.ano_modelo,
    matricula: b.matricula, area_construida_m2: b.area_construida_m2, valor: b.valor,
    id_setor: b.id_setor, situacao: b.situacao || 'ativo', data_inativacao: b.data_inativacao || null
  };
}

// Apólices que cobrem os bens, com a vigência e o projeto que a financia
// (RN40). Um bem coberto por várias apólices relaciona-se a todos os
// projetos correspondentes.
async function apolicesDosBens(conexao, ids) {
  if (ids.length === 0) return new Map();
  const [linhas] = await conexao.query(
    `SELECT it.id_bem, ap.id_apolice, ap.numero, ap.situacao, t.descricao AS tipo_seguro,
            COALESCE(f.nome_fantasia, f.razao_social) AS seguradora, va.numero AS vigencia,
            DATE_FORMAT(va.data_inicio, '%Y-%m-%d') AS inicio, DATE_FORMAT(va.data_fim, '%Y-%m-%d') AS fim,
            it.valor_segurado, p.id_projeto, p.codigo AS projeto_codigo, p.nome AS projeto_nome
       FROM item_segurado it
       JOIN vigencia_apolice va ON va.id_vigencia_apolice = it.id_vigencia_apolice
       JOIN apolice ap          ON ap.id_apolice = va.id_apolice
       JOIN tipo_seguro t       ON t.id_tipo_seguro = ap.id_tipo_seguro
       JOIN fornecedor f        ON f.id_fornecedor = ap.id_seguradora
       JOIN projeto p           ON p.id_projeto = va.id_projeto_pagador
      WHERE it.id_bem IN (?)
      ORDER BY va.data_inicio DESC, ap.numero`, [ids]);
  const porBem = new Map();
  for (const l of linhas) {
    const { id_bem: idBem, ...apolice } = l;
    if (!porBem.has(idBem)) porBem.set(idBem, []);
    porBem.get(idBem).push(apolice);
  }
  return porBem;
}

// Projetos distintos, na ordem em que aparecem nas apólices
function projetosDasApolices(apolices) {
  const vistos = new Map();
  for (const a of apolices) {
    if (!vistos.has(a.id_projeto)) vistos.set(a.id_projeto, { id_projeto: a.id_projeto, codigo: a.projeto_codigo, nome: a.projeto_nome });
  }
  return [...vistos.values()];
}

async function comApolices(conexao, bens) {
  const porBem = await apolicesDosBens(conexao, bens.map((b) => b.id_bem));
  return bens.map((b) => {
    const apolices = porBem.get(b.id_bem) || [];
    return { ...b, apolices, projetos: projetosDasApolices(apolices) };
  });
}

async function buscarOuFalhar(conexao, id, bloquear = false) {
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS} ${TABELAS} WHERE b.id_bem = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  if (!linhas[0]) throw AppError.naoEncontrado('Bem não encontrado.');
  return publico(linhas[0]);
}

// Placa identifica o veículo: não se repete
async function conferirPlaca(conexao, placa, idAtual) {
  if (!placa) return;
  const [linhas] = await conexao.query('SELECT identificacao FROM bem WHERE placa = ? AND id_bem <> ?', [placa, idAtual || 0]);
  if (linhas[0]) throw AppError.campos({ placa: `Esta placa já está cadastrada (${linhas[0].identificacao}).` });
}

async function conferirSetor(conexao, idSetor, idSetorAtual) {
  if (!idSetor) return;
  const [[setor]] = await conexao.query('SELECT ativo FROM setor WHERE id_setor = ?', [idSetor]);
  if (!setor) throw AppError.campos({ id_setor: 'Setor não encontrado.' });
  if (!setor.ativo && idSetor !== idSetorAtual) throw AppError.campos({ id_setor: 'Este setor está inativo.' });
}

// Inativar, reativar e excluir um equipamento seguem pelo cadastro de
// Equipamentos (RN08 e vínculos com licenças)
function recusarSeEquipamento(bem, acao) {
  if (bem.e_equipamento) {
    throw AppError.conflito(
      `Este bem é o equipamento ${bem.etiqueta_instituto}: para ${acao}, use o cadastro de Equipamentos (RN08).`,
      'BEM_E_EQUIPAMENTO');
  }
}

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];
  if (filtros.busca) {
    const termo = `%${String(filtros.busca).trim()}%`;
    condicoes.push(`(b.identificacao LIKE ? OR b.placa LIKE ? OR b.numero_serie LIKE ? OR b.patrimonio LIKE ?
                     OR b.endereco LIKE ? OR e.etiqueta_instituto LIKE ?)`);
    valores.push(termo, termo, termo, termo, termo, termo);
  }
  if (Object.keys(ROTULO_CATEGORIA).includes(filtros.categoria)) {
    condicoes.push('b.categoria = ?');
    valores.push(filtros.categoria);
  }
  if (filtros.situacao === 'ativo' || filtros.situacao === 'inativo') {
    condicoes.push('b.situacao = ?');
    valores.push(filtros.situacao);
  }
  if (filtros.id_setor) {
    condicoes.push('b.id_setor = ?');
    valores.push(Number(filtros.id_setor));
  }
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} ${TABELAS}
      ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
      ORDER BY b.situacao = 'inativo', FIELD(b.categoria, 'veiculo', 'drone', 'imovel', 'equipamento', 'outro'), b.identificacao`,
    valores);
  return comApolices(pool, linhas.map(publico));
}


async function buscar(id) {
  const [bem] = await comApolices(pool, [await buscarOuFalhar(pool, id)]);
  return bem;
}

async function incluir(dados, idUsuario) {
  return comTransacao(async (conexao) => {
    await conferirPlaca(conexao, dados.placa, null);
    await conferirSetor(conexao, dados.id_setor, null);
    const [r] = await conexao.query(
      `INSERT INTO bem (categoria, identificacao, patrimonio, placa, numero_serie, endereco, renavam,
                        ano_modelo, matricula, area_construida_m2, valor, id_setor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [dados.categoria, dados.identificacao, dados.patrimonio, dados.placa, dados.numero_serie, dados.endereco,
       dados.renavam, dados.ano_modelo, dados.matricula, dados.area_construida_m2, dados.valor, dados.id_setor]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'criacao', entidade: 'bem', idRegistro: r.insertId,
      descricao: `${nomeDoBem(dados)} cadastrado`, depois: retrato(dados)
    });
    return buscarOuFalhar(conexao, r.insertId);
  });
}

// Correção pelo Administrador. Num equipamento, a categoria continua
// "equipamento" e o setor continua obrigatório.
async function alterar(id, dados, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    if (atual.e_equipamento) {
      if (dados.categoria !== 'equipamento') {
        throw AppError.campos({ categoria: 'Este bem é um equipamento do cadastro de Equipamentos; a categoria não muda.' });
      }
      if (!dados.id_setor) throw AppError.campos({ id_setor: 'Selecione o setor do equipamento.' });
    }
    await conferirPlaca(conexao, dados.placa, id);
    await conferirSetor(conexao, dados.id_setor, atual.id_setor);
    await conexao.query(
      `UPDATE bem SET categoria = ?, identificacao = ?, patrimonio = ?, placa = ?, numero_serie = ?, endereco = ?,
              renavam = ?, ano_modelo = ?, matricula = ?, area_construida_m2 = ?, valor = ?, id_setor = ?
        WHERE id_bem = ?`,
      [dados.categoria, dados.identificacao, dados.patrimonio, dados.placa, dados.numero_serie, dados.endereco,
       dados.renavam, dados.ano_modelo, dados.matricula, dados.area_construida_m2, dados.valor, dados.id_setor, id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'correcao', entidade: 'bem', idRegistro: id,
      descricao: `${nomeDoBem(dados)}: dados corrigidos`,
      antes: retrato(atual), depois: retrato({ ...dados, situacao: atual.situacao, data_inativacao: atual.data_inativacao })
    });
    return buscarOuFalhar(conexao, id);
  });
}

async function inativar(id, evento, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    recusarSeEquipamento(atual, 'inativar');
    if (atual.situacao === 'inativo') throw AppError.conflito('Este bem já está inativo.');
    await conexao.query(`UPDATE bem SET situacao = 'inativo', data_inativacao = ? WHERE id_bem = ?`, [evento.data_efetiva, id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'inativacao', entidade: 'bem', idRegistro: id,
      dataEvento: evento.data_efetiva, motivo: evento.motivo,
      descricao: `${nomeDoBem(atual)} inativado`,
      antes: retrato(atual), depois: retrato({ ...atual, situacao: 'inativo', data_inativacao: evento.data_efetiva })
    });
    return buscarOuFalhar(conexao, id);
  });
}

async function reativar(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    recusarSeEquipamento(atual, 'reativar');
    if (atual.situacao === 'ativo') throw AppError.conflito('Este bem já está ativo.');
    await conexao.query(`UPDATE bem SET situacao = 'ativo', data_inativacao = NULL WHERE id_bem = ?`, [id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'reativacao', entidade: 'bem', idRegistro: id,
      descricao: `${nomeDoBem(atual)} reativado`,
      antes: retrato(atual), depois: retrato({ ...atual, situacao: 'ativo', data_inativacao: null })
    });
    return buscarOuFalhar(conexao, id);
  });
}

module.exports = { listar, buscar, incluir, alterar, inativar, reativar, ROTULO_CATEGORIA };
