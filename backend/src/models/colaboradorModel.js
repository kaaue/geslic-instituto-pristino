// Model da RF_B4 - Gerenciar colaboradores.
//
// - Nome igual a outro gera aviso de homônimo e permite continuar; o e-mail
//   repetido é bloqueado (RN19).
// - O Operador inclui; corrigir, desligar e excluir são do Administrador.
// - O desligamento exige data efetiva (RN37), encerra as utilizações nessa
//   data e deixa as instâncias ativas e vagas (RN07). Se o colaborador
//   coordenava um setor, o setor fica sem coordenador (o coordenador é
//   sempre um colaborador ativo).
// - A participação em projetos é mostrada aqui, mas gerenciada no cadastro
//   do projeto (RN38). O cadastro não cria conta de acesso.

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const Historico = require('./historicoModel');

const COLUNAS = `
    c.id_colaborador, c.nome, c.cargo, c.email, c.id_setor, s.nome AS nome_setor, c.ativo,
    DATE_FORMAT(c.data_desligamento, '%Y-%m-%d') AS data_desligamento,
    (SELECT GROUP_CONCAT(p.codigo ORDER BY p.codigo SEPARATOR ', ')
       FROM colaborador_projeto cp JOIN projeto p ON p.id_projeto = cp.id_projeto
      WHERE cp.id_colaborador = c.id_colaborador) AS projetos,
    (SELECT u.login FROM usuario u WHERE u.id_colaborador = c.id_colaborador) AS login_conta`;

const TABELAS = `
    FROM colaborador c
    JOIN setor s ON s.id_setor = c.id_setor`;

const publico = (l) => l && { ...l, ativo: Boolean(l.ativo) };

function retrato(c) {
  return {
    nome: c.nome, cargo: c.cargo, email: c.email, id_setor: c.id_setor,
    ativo: c.ativo === undefined ? true : Boolean(c.ativo), data_desligamento: c.data_desligamento || null
  };
}

async function buscarOuFalhar(conexao, id, bloquear = false) {
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS} ${TABELAS} WHERE c.id_colaborador = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  if (!linhas[0]) throw AppError.naoEncontrado('Colaborador não encontrado.');
  return publico(linhas[0]);
}

// O e-mail identifica a pessoa: não se repete entre colaboradores (RN19)
async function conferirEmail(conexao, email, idAtual) {
  if (!email) return;
  const [linhas] = await conexao.query(
    'SELECT 1 FROM colaborador WHERE email = ? AND id_colaborador <> ?', [email, idAtual || 0]);
  if (linhas.length) throw AppError.campos({ email: 'Este e-mail já pertence a outro colaborador.' });
}

// Setor existente; para vínculo novo, ativo
async function conferirSetor(conexao, idSetor, idSetorAtual) {
  const [[setor]] = await conexao.query('SELECT ativo FROM setor WHERE id_setor = ?', [idSetor]);
  if (!setor) throw AppError.campos({ id_setor: 'Setor não encontrado.' });
  if (!setor.ativo && idSetor !== idSetorAtual) throw AppError.campos({ id_setor: 'Este setor está inativo.' });
}

// Só colaboradores ativos podem ser escolhidos como responsáveis
async function listarAtivos() {
  const [linhas] = await pool.query(
    `SELECT c.id_colaborador, c.nome, c.cargo, c.id_setor, s.nome AS nome_setor
       FROM colaborador c
       JOIN setor s ON s.id_setor = c.id_setor
      WHERE c.ativo = TRUE
      ORDER BY c.nome`);
  return linhas;
}

async function listar(filtros = {}) {
  const condicoes = [];
  const valores = [];
  if (filtros.busca) {
    const termo = `%${String(filtros.busca).trim()}%`;
    condicoes.push('(c.nome LIKE ? OR c.email LIKE ? OR c.cargo LIKE ?)');
    valores.push(termo, termo, termo);
  }
  if (filtros.id_setor) {
    condicoes.push('c.id_setor = ?');
    valores.push(Number(filtros.id_setor));
  }
  if (filtros.situacao === 'ativo') condicoes.push('c.ativo = TRUE');
  if (filtros.situacao === 'desligado') condicoes.push('c.ativo = FALSE');
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} ${TABELAS}
      ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
      ORDER BY c.ativo DESC, c.nome`, valores);
  return linhas.map(publico);
}

// Possíveis homônimos (RN19): mesmo nome, comparado sem maiúsculas e espaços extras
async function homonimos(nome, exceto) {
  if (!nome) return [];
  const [linhas] = await pool.query(
    `SELECT c.id_colaborador, c.nome, s.nome AS nome_setor, c.ativo
       FROM colaborador c JOIN setor s ON s.id_setor = c.id_setor
      WHERE c.nome = ? AND c.id_colaborador <> ?
      ORDER BY c.ativo DESC`, [nome, exceto || 0]);
  return linhas.map(publico);
}

async function buscar(id) {
  const colaborador = await buscarOuFalhar(pool, id);
  const [participacoes] = await pool.query(
    `SELECT p.id_projeto, p.codigo, p.nome, p.situacao
       FROM colaborador_projeto cp JOIN projeto p ON p.id_projeto = cp.id_projeto
      WHERE cp.id_colaborador = ? ORDER BY p.codigo`, [id]);
  return { ...colaborador, participacoes };
}

async function incluir(dados, idUsuario) {
  return comTransacao(async (conexao) => {
    await conferirEmail(conexao, dados.email, null);
    await conferirSetor(conexao, dados.id_setor, null);
    const [r] = await conexao.query(
      'INSERT INTO colaborador (nome, cargo, email, id_setor) VALUES (?, ?, ?, ?)',
      [dados.nome, dados.cargo, dados.email, dados.id_setor]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'criacao', entidade: 'colaborador', idRegistro: r.insertId,
      descricao: `Colaborador ${dados.nome} cadastrado`, depois: retrato(dados)
    });
    return buscarOuFalhar(conexao, r.insertId);
  });
}

async function alterar(id, dados, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    await conferirEmail(conexao, dados.email, id);
    await conferirSetor(conexao, dados.id_setor, atual.id_setor);
    await conexao.query(
      'UPDATE colaborador SET nome = ?, cargo = ?, email = ?, id_setor = ? WHERE id_colaborador = ?',
      [dados.nome, dados.cargo, dados.email, dados.id_setor, id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'correcao', entidade: 'colaborador', idRegistro: id,
      descricao: `Colaborador ${dados.nome}: dados corrigidos`,
      antes: retrato(atual), depois: retrato({ ...atual, ...dados })
    });
    return buscarOuFalhar(conexao, id);
  });
}

// O que o desligamento vai afetar, para a interface avisar antes de confirmar
async function previaDesligamento(id) {
  const colaborador = await buscarOuFalhar(pool, id);
  const [utilizacoes] = await pool.query(
    `SELECT l.codigo AS licenca, l.nome_software, i.identificacao
       FROM utilizacao u
       JOIN instancia i ON i.id_instancia = u.id_instancia
       JOIN licenca l   ON l.id_licenca = i.id_licenca
      WHERE u.id_colaborador = ? AND u.data_fim IS NULL`, [id]);
  const [setores] = await pool.query('SELECT id_setor, nome FROM setor WHERE id_coordenador = ?', [id]);
  const [equipamentos] = await pool.query(
    `SELECT e.etiqueta_instituto FROM equipamento e JOIN bem b ON b.id_bem = e.id_equipamento
      WHERE e.id_responsavel = ? AND b.situacao = 'ativo' ORDER BY e.etiqueta_instituto`, [id]);
  const [projetos] = await pool.query(
    `SELECT codigo, nome FROM projeto WHERE id_responsavel = ? AND situacao = 'em_andamento' ORDER BY codigo`, [id]);
  const [[conta]] = await pool.query('SELECT login, situacao FROM usuario WHERE id_colaborador = ?', [id]);
  return {
    colaborador,
    utilizacoes,
    setores_coordenados: setores,
    equipamentos_responsavel: equipamentos.map((e) => e.etiqueta_instituto),
    projetos_responsavel: projetos,
    conta: conta || null
  };
}

// Desligamento (RN07, RN37)
async function desligar(id, evento, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    if (!atual.ativo) throw AppError.conflito('Este colaborador já está desligado.');

    await conexao.query(
      'UPDATE colaborador SET ativo = FALSE, data_desligamento = ? WHERE id_colaborador = ?',
      [evento.data_efetiva, id]);
    // As utilizações terminam na data efetiva (nunca antes do próprio início);
    // as instâncias continuam ativas e passam a vagas (RN07)
    const [utilizacoes] = await conexao.query(
      `UPDATE utilizacao SET data_fim = GREATEST(data_inicio, ?)
        WHERE id_colaborador = ? AND data_fim IS NULL`, [evento.data_efetiva, id]);
    const [setores] = await conexao.query(
      'SELECT id_setor, nome FROM setor WHERE id_coordenador = ? FOR UPDATE', [id]);
    if (setores.length) {
      await conexao.query('UPDATE setor SET id_coordenador = NULL WHERE id_coordenador = ?', [id]);
      for (const setor of setores) {
        await Historico.registrar(conexao, {
          idUsuario, tipo: 'correcao', entidade: 'setor', idRegistro: setor.id_setor, dataEvento: evento.data_efetiva,
          descricao: `Setor ${setor.nome}: sem coordenador após o desligamento de ${atual.nome}`,
          antes: { id_coordenador: id }, depois: { id_coordenador: null }
        });
      }
    }

    const efeitos = [];
    if (utilizacoes.affectedRows) efeitos.push(`${utilizacoes.affectedRows} utilização(ões) encerrada(s)`);
    if (setores.length) efeitos.push(`deixou de coordenar ${setores.map((s) => s.nome).join(', ')}`);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'desligamento', entidade: 'colaborador', idRegistro: id,
      dataEvento: evento.data_efetiva, motivo: evento.motivo,
      descricao: `Colaborador ${atual.nome} desligado${efeitos.length ? '; ' + efeitos.join('; ') : ''}`,
      antes: retrato(atual), depois: retrato({ ...atual, ativo: false, data_desligamento: evento.data_efetiva })
    });
    return {
      colaborador: await buscarOuFalhar(conexao, id),
      utilizacoes_encerradas: utilizacoes.affectedRows,
      setores_sem_coordenador: setores.map((s) => s.nome)
    };
  });
}

// Reativação pelo Administrador (desligamento registrado por engano ou
// retorno da pessoa). As utilizações encerradas não voltam sozinhas.
async function reativar(id, idUsuario) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, true);
    if (atual.ativo) throw AppError.conflito('Este colaborador já está ativo.');
    await conexao.query('UPDATE colaborador SET ativo = TRUE, data_desligamento = NULL WHERE id_colaborador = ?', [id]);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'reativacao', entidade: 'colaborador', idRegistro: id,
      descricao: `Colaborador ${atual.nome} reativado`,
      antes: retrato(atual), depois: retrato({ ...atual, ativo: true, data_desligamento: null })
    });
    return buscarOuFalhar(conexao, id);
  });
}

module.exports = {
  listarAtivos, listar, homonimos, buscar, incluir, alterar, previaDesligamento, desligar, reativar
};
