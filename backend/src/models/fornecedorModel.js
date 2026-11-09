// Model da RF_B1 - Gerenciar fornecedores e seguradoras.
// Empresas com as quais o Instituto contrata licenças (fornecedor de
// software) e seguros (seguradora). CNPJ único. Com licenças ou apólices
// vinculadas, o cadastro não é excluído, apenas inativado (RN22); a data
// efetiva da inativação fica no evento do histórico (RN37).

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const Historico = require('./historicoModel');
const { bloquearExclusaoComVinculos } = require('./cadastroComum');

const COLUNAS = `
    f.id_fornecedor, f.razao_social, f.nome_fantasia, f.cnpj, f.tipo,
    f.contato, f.telefone, f.email, f.ativo,
    (SELECT COUNT(DISTINCT v.id_licenca) FROM vigencia_licenca v
      WHERE v.id_fornecedor = f.id_fornecedor) AS licencas,
    (SELECT COUNT(*) FROM apolice a WHERE a.id_seguradora = f.id_fornecedor) AS apolices`;

const VINCULOS = [
  { sql: 'SELECT COUNT(DISTINCT id_licenca) AS total FROM vigencia_licenca WHERE id_fornecedor = ?', singular: 'licença', plural: 'licenças' },
  { sql: 'SELECT COUNT(*) AS total FROM apolice WHERE id_seguradora = ?', singular: 'apólice', plural: 'apólices' }
];

const publico = (l) => l && { ...l, ativo: Boolean(l.ativo) };

function retrato(f) {
  return {
    tipo: f.tipo, razao_social: f.razao_social, nome_fantasia: f.nome_fantasia, cnpj: f.cnpj,
    contato: f.contato, telefone: f.telefone, email: f.email, ativo: f.ativo === undefined ? true : Boolean(f.ativo)
  };
}

const nomeCurto = (f) => f.nome_fantasia || f.razao_social;

async function buscarOuFalhar(conexao, id, bloquear = false) {
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS} FROM fornecedor f WHERE f.id_fornecedor = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  if (!linhas[0]) throw AppError.naoEncontrado('Fornecedor ou seguradora não encontrado.');
  return publico(linhas[0]);
}

async function conferirCnpj(conexao, cnpj, idAtual) {
  const [linhas] = await conexao.query(
    'SELECT razao_social FROM fornecedor WHERE cnpj = ? AND id_fornecedor <> ?', [cnpj, idAtual || 0]);
  if (linhas[0]) throw AppError.campos({ cnpj: `Este CNPJ já está cadastrado (${linhas[0].razao_social}).` });
}

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];
  if (filtros.busca) {
    const termo = `%${String(filtros.busca).trim()}%`;
    const digitos = String(filtros.busca).replace(/\D/g, '');
    condicoes.push(`(f.razao_social LIKE ? OR f.nome_fantasia LIKE ?${digitos ? ' OR f.cnpj LIKE ?' : ''})`);
    valores.push(termo, termo, ...(digitos ? [`%${digitos}%`] : []));
  }
  if (['software', 'seguradora'].includes(filtros.tipo)) {
    condicoes.push('f.tipo = ?');
    valores.push(filtros.tipo);
  }
  if (filtros.situacao === 'ativo') condicoes.push('f.ativo = TRUE');
  if (filtros.situacao === 'inativo') condicoes.push('f.ativo = FALSE');
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} FROM fornecedor f
      ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
      ORDER BY f.ativo DESC, f.razao_social`, valores);
  return linhas.map(publico);
}

async function buscar(id) {
  return buscarOuFalhar(pool, id);
}

async function incluir(dados, idUsuario) {
  return comTransacao(async (conexao) => {
    await conferirCnpj(conexao, dados.cnpj, null);
    const [r] = await conexao.query(
      `INSERT INTO fornecedor (razao_social, nome_fantasia, cnpj, tipo, contato, telefone, email)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [dados.razao_social, dados.nome_fantasia, dados.cnpj, dados.tipo, dados.contato, dados.telefone, dados.email]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'criacao', entidade: 'fornecedor', idRegistro: r.insertId,
      descricao: `${dados.tipo === 'seguradora' ? 'Seguradora' : 'Fornecedor'} ${nomeCurto(dados)} cadastrado`,
      depois: retrato(dados)
    });
    return buscarOuFalhar(conexao, r.insertId);
  });
}

// Correção dos dados (exclusiva do Administrador, RN21). O tipo só muda se
// não contradizer os vínculos: quem tem licença continua fornecedor de
// software, quem tem apólice continua seguradora.
async function alterar(id, dados, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    await conferirCnpj(conexao, dados.cnpj, id);
    if (dados.tipo === 'seguradora' && atual.licencas > 0) {
      throw AppError.campos({ tipo: 'Com licenças vinculadas, o cadastro continua como fornecedor de software.' });
    }
    if (dados.tipo === 'software' && atual.apolices > 0) {
      throw AppError.campos({ tipo: 'Com apólices vinculadas, o cadastro continua como seguradora.' });
    }
    await conexao.query(
      `UPDATE fornecedor SET razao_social = ?, nome_fantasia = ?, cnpj = ?, tipo = ?,
              contato = ?, telefone = ?, email = ?
        WHERE id_fornecedor = ?`,
      [dados.razao_social, dados.nome_fantasia, dados.cnpj, dados.tipo, dados.contato, dados.telefone, dados.email, id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'correcao', entidade: 'fornecedor', idRegistro: id,
      descricao: `${nomeCurto(dados)}: dados corrigidos`,
      antes: retrato(atual), depois: retrato({ ...dados, ativo: atual.ativo })
    });
    return buscarOuFalhar(conexao, id);
  });
}

async function inativar(id, evento, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    if (!atual.ativo) throw AppError.conflito('Este cadastro já está inativo.');
    await conexao.query('UPDATE fornecedor SET ativo = FALSE WHERE id_fornecedor = ?', [id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'inativacao', entidade: 'fornecedor', idRegistro: id, dataEvento: evento.data_efetiva,
      descricao: `${nomeCurto(atual)} inativado`, motivo: evento.motivo,
      antes: retrato(atual), depois: retrato({ ...atual, ativo: false })
    });
    return buscarOuFalhar(conexao, id);
  });
}

async function reativar(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    if (atual.ativo) throw AppError.conflito('Este cadastro já está ativo.');
    await conexao.query('UPDATE fornecedor SET ativo = TRUE WHERE id_fornecedor = ?', [id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'reativacao', entidade: 'fornecedor', idRegistro: id,
      descricao: `${nomeCurto(atual)} reativado`,
      antes: retrato(atual), depois: retrato({ ...atual, ativo: true })
    });
    return buscarOuFalhar(conexao, id);
  });
}

async function excluir(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    await bloquearExclusaoComVinculos(conexao, VINCULOS, id, `${nomeCurto(atual)}`);
    await conexao.query('DELETE FROM fornecedor WHERE id_fornecedor = ?', [id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'exclusao', entidade: 'fornecedor', idRegistro: id,
      descricao: `${nomeCurto(atual)} excluído`, antes: retrato(atual)
    });
    return { excluido: true };
  });
}

module.exports = { listar, buscar, incluir, alterar, inativar, reativar, excluir };
