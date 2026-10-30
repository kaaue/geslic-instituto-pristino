// Model das contas de acesso (RF_B9): acesso ao banco e regras.
//
// Conta de acesso e colaborador são conceitos separados: a conta pode ser
// ligada a no máximo um colaborador (e vice-versa), mas nenhum dos dois cria
// o outro. O perfil (Administrador ou Operador) e as permissões vêm sempre do
// banco, nunca do que o cliente envia.
//
// Regras da RN27 aplicadas aqui:
// - só quem tem usuario.gerenciar concede ou revoga perfis (rotas);
// - sempre há ao menos um Administrador ativo: revogar ou inativar o último
//   é bloqueado, e a conta só revoga o próprio perfil se houver outro;
// - a alteração de perfil exige motivo e data efetiva, encerra as sessões da
//   conta alterada e fica no histórico;
// - contas não são excluídas, para preservar o histórico (só a solicitação
//   de autocadastro recusada, que nunca teve acesso, é removida).

const { pool, comTransacao } = require('../config/database');
const AppError = require('../utils/AppError');
const { lancarSeHouverErros } = require('../utils/AppError');
const { gerarHashSenha, verificarSenha, gerarSenhaProvisoria } = require('../utils/senha');
const Sessao = require('./sessaoModel');
const Historico = require('./historicoModel');

const ADMINISTRADOR = 'Administrador';
const OPERADOR = 'Operador';
const NAO_ENCONTRADA = 'Conta não encontrada.';

// Dados públicos da conta: nunca inclui senha_hash nem tokens
const COLUNAS = `
    u.id_usuario, u.nome, u.login, u.email, u.situacao,
    u.troca_senha_obrigatoria, u.id_perfil, p.nome AS perfil,
    p.visualiza_dados_sensiveis, u.id_colaborador, c.nome AS nome_colaborador,
    DATE_FORMAT(u.criada_em, '%Y-%m-%dT%H:%i:%s')        AS criada_em,
    DATE_FORMAT(u.ultimo_acesso_em, '%Y-%m-%dT%H:%i:%s') AS ultimo_acesso_em`;

const TABELAS = `
    FROM usuario u
    JOIN perfil p           ON p.id_perfil = u.id_perfil
    LEFT JOIN colaborador c ON c.id_colaborador = u.id_colaborador`;

function publico(linha) {
  if (!linha) return null;
  return {
    ...linha,
    troca_senha_obrigatoria: Boolean(linha.troca_senha_obrigatoria),
    visualiza_dados_sensiveis: Boolean(linha.visualiza_dados_sensiveis)
  };
}

// Retrato da conta para o histórico: identifica a mudança, sem segredos
function retrato(conta) {
  return {
    nome: conta.nome, login: conta.login, email: conta.email,
    perfil: conta.perfil, situacao: conta.situacao, id_colaborador: conta.id_colaborador
  };
}

async function buscar(conexao, id, { bloquear = false } = {}) {
  const [linhas] = await conexao.query(
    `SELECT ${COLUNAS} ${TABELAS} WHERE u.id_usuario = ? ${bloquear ? 'FOR UPDATE' : ''}`, [id]);
  return publico(linhas[0]);
}

async function buscarOuFalhar(conexao, id, opcoes) {
  const conta = await buscar(conexao, id, opcoes);
  if (!conta) throw AppError.naoEncontrado(NAO_ENCONTRADA);
  return conta;
}

async function permissoesDoPerfil(conexao, idPerfil) {
  const [linhas] = await conexao.query(
    `SELECT pe.codigo FROM perfil_permissao pp
       JOIN permissao pe ON pe.id_permissao = pp.id_permissao
      WHERE pp.id_perfil = ? ORDER BY pe.codigo`, [idPerfil]);
  return linhas.map((l) => l.codigo);
}

async function perfilOuErro(conexao, idPerfil, erros) {
  if (!idPerfil) return null;
  const [linhas] = await conexao.query('SELECT id_perfil, nome FROM perfil WHERE id_perfil = ?', [idPerfil]);
  if (!linhas[0]) erros.id_perfil = 'Perfil inexistente.';
  return linhas[0] || null;
}

// Login e e-mail únicos entre as contas
async function conferirUnicidade(conexao, { login, email }, idAtual, erros) {
  if (login) {
    const [l] = await conexao.query(
      'SELECT 1 FROM usuario WHERE login = ? AND id_usuario <> ?', [login, idAtual || 0]);
    if (l.length) erros.login = 'Este login já está em uso.';
  }
  if (email) {
    const [e] = await conexao.query(
      'SELECT 1 FROM usuario WHERE email = ? AND id_usuario <> ?', [email, idAtual || 0]);
    if (e.length) erros.email = 'Já existe uma conta com este e-mail.';
  }
}

// Vínculo com colaborador: precisa existir, não pode estar ligado a outra
// conta e, para vínculo novo, precisa estar ativo.
async function conferirColaborador(conexao, idColaborador, idAtual, idColaboradorAtual, erros) {
  if (!idColaborador) return;
  const [linhas] = await conexao.query(
    `SELECT c.ativo, (SELECT u.id_usuario FROM usuario u
                       WHERE u.id_colaborador = c.id_colaborador AND u.id_usuario <> ?) AS outra_conta
       FROM colaborador c WHERE c.id_colaborador = ?`, [idAtual || 0, idColaborador]);
  const c = linhas[0];
  if (!c) erros.id_colaborador = 'Colaborador não encontrado.';
  else if (c.outra_conta) erros.id_colaborador = 'Este colaborador já está vinculado a outra conta.';
  else if (!c.ativo && idColaborador !== idColaboradorAtual) {
    erros.id_colaborador = 'Colaborador desligado não pode ser vinculado a uma conta.';
  }
}

// Bloqueia (FOR UPDATE) os Administradores ativos e garante que, tirando a
// conta `idAlvo`, sobra pelo menos um (RN27).
async function garantirOutroAdministrador(conexao, idAlvo) {
  const [linhas] = await conexao.query(
    `SELECT u.id_usuario FROM usuario u JOIN perfil p ON p.id_perfil = u.id_perfil
      WHERE p.nome = ? AND u.situacao = 'ativo' FOR UPDATE`, [ADMINISTRADOR]);
  if (!linhas.some((l) => l.id_usuario !== idAlvo)) {
    throw AppError.conflito(
      'O sistema precisa manter ao menos um Administrador ativo. ' +
      'Conceda o perfil Administrador a outra conta antes desta alteração.');
  }
}

// Conceder o perfil Administrador exige motivo (RN27)
function exigirMotivoAoConcederAdmin(perfil, motivo) {
  if (perfil && perfil.nome === ADMINISTRADOR && !motivo) {
    throw AppError.campos({ motivo: 'Informe o motivo ao conceder o perfil Administrador.' });
  }
}

// ---------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------

// Conta da sessão, com perfil e permissões atuais. Só contas ativas.
async function carregarAutenticado(idUsuario) {
  const conta = await buscar(pool, idUsuario);
  if (!conta || conta.situacao !== 'ativo') return null;
  return { ...conta, permissoes: await permissoesDoPerfil(pool, conta.id_perfil) };
}

// Para o login: aceita o login ou o e-mail; inclui o hash para conferência
async function buscarParaLogin(identificador) {
  const [linhas] = await pool.query(
    'SELECT id_usuario, situacao, senha_hash FROM usuario WHERE login = ? OR email = ? LIMIT 1',
    [identificador, identificador]);
  return linhas[0] || null;
}

async function registrarAcesso(conexao, idUsuario) {
  await conexao.query('UPDATE usuario SET ultimo_acesso_em = NOW() WHERE id_usuario = ?', [idUsuario]);
}

// Autocadastro: conta pendente, perfil Operador, sem colaborador. O perfil
// definitivo e o vínculo com colaborador são decididos na aprovação.
async function solicitarCadastro(dados) {
  return comTransacao(async (conexao) => {
    const erros = {};
    await conferirUnicidade(conexao, dados, null, erros);
    lancarSeHouverErros(erros);
    const [resultado] = await conexao.query(
      `INSERT INTO usuario (id_perfil, nome, login, email, senha_hash, situacao, senha_alterada_em)
       SELECT id_perfil, ?, ?, ?, ?, 'pendente', NOW() FROM perfil WHERE nome = ?`,
      [dados.nome, dados.login, dados.email, gerarHashSenha(dados.senha), OPERADOR]);
    return { id_usuario: resultado.insertId };
  });
}

// ---------------------------------------------------------------
// Minha conta
// ---------------------------------------------------------------

async function alterarDadosProprios(idUsuario, dados) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, idUsuario, { bloquear: true });
    const erros = {};
    await conferirUnicidade(conexao, { email: dados.email }, idUsuario, erros);
    lancarSeHouverErros(erros);
    await conexao.query('UPDATE usuario SET nome = ?, email = ? WHERE id_usuario = ?',
      [dados.nome, dados.email, idUsuario]);
    const depois = { ...atual, ...dados };
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'correcao', entidade: 'usuario', idRegistro: idUsuario,
      descricao: `Conta ${atual.login}: dados atualizados pela própria conta`,
      antes: retrato(atual), depois: retrato(depois)
    });
    return buscar(conexao, idUsuario);
  });
}

// Troca da própria senha, após conferir a atual. Encerra as outras sessões
// da conta e mantém a atual.
async function alterarSenhaPropria(idUsuario, senhaAtual, novaSenha, idSessaoAtual) {
  return comTransacao(async (conexao) => {
    const [[conta]] = await conexao.query(
      'SELECT login, senha_hash FROM usuario WHERE id_usuario = ? FOR UPDATE', [idUsuario]);
    if (!conta || !verificarSenha(senhaAtual, conta.senha_hash)) {
      throw AppError.campos({ senha_atual: 'A senha atual não confere.' });
    }
    if (verificarSenha(novaSenha, conta.senha_hash)) {
      throw AppError.campos({ senha: 'A nova senha deve ser diferente da atual.' });
    }
    await conexao.query(
      `UPDATE usuario SET senha_hash = ?, troca_senha_obrigatoria = FALSE, senha_alterada_em = NOW()
        WHERE id_usuario = ?`, [gerarHashSenha(novaSenha), idUsuario]);
    const encerradas = await Sessao.encerrarDaConta(conexao, idUsuario, 'troca_senha', idSessaoAtual);
    await Historico.registrar(conexao, {
      idUsuario, tipo: 'senha', entidade: 'usuario', idRegistro: idUsuario,
      descricao: `Conta ${conta.login}: senha alterada pela própria conta` +
        (encerradas ? `; ${encerradas} outra(s) sessão(ões) encerrada(s)` : '')
    });
  });
}

// ---------------------------------------------------------------
// Gerenciamento pelo Administrador
// ---------------------------------------------------------------

async function listar(filtros) {
  const condicoes = [];
  const valores = [];
  if (filtros.busca) {
    condicoes.push('(u.nome LIKE ? OR u.login LIKE ? OR u.email LIKE ?)');
    const termo = `%${String(filtros.busca).trim()}%`;
    valores.push(termo, termo, termo);
  }
  if (filtros.id_perfil) {
    condicoes.push('u.id_perfil = ?');
    valores.push(Number(filtros.id_perfil));
  }
  if (['pendente', 'ativo', 'inativo'].includes(filtros.situacao)) {
    condicoes.push('u.situacao = ?');
    valores.push(filtros.situacao);
  }
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} ${TABELAS}
      ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
      ORDER BY FIELD(u.situacao, 'pendente', 'ativo', 'inativo'), u.nome`, valores);
  return linhas.map(publico);
}

async function buscarPorId(id) {
  return buscarOuFalhar(pool, id);
}

// Conta criada pelo Administrador: já ativa, com senha provisória gerada pelo
// sistema e troca obrigatória no primeiro acesso. A senha é devolvida uma vez.
async function criar(dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    const erros = {};
    const perfil = await perfilOuErro(conexao, dados.id_perfil, erros);
    await conferirUnicidade(conexao, dados, null, erros);
    await conferirColaborador(conexao, dados.id_colaborador, null, null, erros);
    lancarSeHouverErros(erros);
    exigirMotivoAoConcederAdmin(perfil, dados.motivo);

    const senha = gerarSenhaProvisoria();
    const [resultado] = await conexao.query(
      `INSERT INTO usuario
         (id_perfil, id_colaborador, nome, login, email, senha_hash, situacao, troca_senha_obrigatoria)
       VALUES (?, ?, ?, ?, ?, ?, 'ativo', TRUE)`,
      [perfil.id_perfil, dados.id_colaborador, dados.nome, dados.login, dados.email, gerarHashSenha(senha)]);
    const conta = await buscar(conexao, resultado.insertId);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'criacao', entidade: 'usuario', idRegistro: conta.id_usuario,
      descricao: `Conta ${conta.login} criada com perfil ${conta.perfil}`,
      motivo: dados.motivo, depois: retrato(conta)
    });
    return { conta, senha_provisoria: senha };
  });
}

// Edição dos dados permitidos (nome, e-mail, login, colaborador). Perfil e
// situação têm ações próprias, com as regras da RN27.
async function atualizar(id, dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, { bloquear: true });
    const erros = {};
    await conferirUnicidade(conexao, dados, id, erros);
    await conferirColaborador(conexao, dados.id_colaborador, id, atual.id_colaborador, erros);
    lancarSeHouverErros(erros);

    await conexao.query(
      'UPDATE usuario SET nome = ?, email = ?, login = ?, id_colaborador = ? WHERE id_usuario = ?',
      [dados.nome, dados.email, dados.login, dados.id_colaborador, id]);
    const depois = await buscar(conexao, id);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'correcao', entidade: 'usuario', idRegistro: id,
      descricao: `Conta ${depois.login}: dados corrigidos`,
      antes: retrato(atual), depois: retrato(depois)
    });
    return depois;
  });
}

async function aprovar(id, dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, { bloquear: true });
    if (atual.situacao !== 'pendente') throw AppError.conflito('Esta conta não está aguardando aprovação.');
    const erros = {};
    const perfil = await perfilOuErro(conexao, dados.id_perfil, erros);
    await conferirColaborador(conexao, dados.id_colaborador, id, null, erros);
    lancarSeHouverErros(erros);
    exigirMotivoAoConcederAdmin(perfil, dados.motivo);

    await conexao.query(
      `UPDATE usuario SET situacao = 'ativo', id_perfil = ?, id_colaborador = ? WHERE id_usuario = ?`,
      [perfil.id_perfil, dados.id_colaborador, id]);
    const depois = await buscar(conexao, id);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'aprovacao', entidade: 'usuario', idRegistro: id,
      descricao: `Solicitação de acesso de ${depois.login} aprovada com perfil ${depois.perfil}`,
      motivo: dados.motivo, antes: retrato(atual), depois: retrato(depois)
    });
    return depois;
  });
}

// A solicitação recusada nunca teve acesso: é removida, liberando login e
// e-mail, e a recusa fica no histórico.
async function rejeitar(id, motivo, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, { bloquear: true });
    if (atual.situacao !== 'pendente') {
      throw AppError.conflito('Só solicitações pendentes podem ser recusadas. Para tirar o acesso, inative a conta.');
    }
    await conexao.query('DELETE FROM usuario WHERE id_usuario = ?', [id]);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'rejeicao', entidade: 'usuario', idRegistro: id,
      descricao: `Solicitação de acesso de ${atual.login} recusada`, motivo, antes: retrato(atual)
    });
    return { removida: true };
  });
}

// Concessão e revogação de perfil (RN27)
async function alterarPerfil(id, dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, { bloquear: true });
    if (atual.situacao === 'pendente') {
      throw AppError.conflito('Defina o perfil ao aprovar a solicitação.');
    }
    const erros = {};
    const perfil = await perfilOuErro(conexao, dados.id_perfil, erros);
    lancarSeHouverErros(erros);
    if (perfil.id_perfil === atual.id_perfil) {
      throw AppError.campos({ id_perfil: `A conta já tem o perfil ${perfil.nome}.` });
    }
    // Revogar o perfil Administrador de uma conta ativa: precisa sobrar outro
    if (atual.perfil === ADMINISTRADOR && atual.situacao === 'ativo') {
      await garantirOutroAdministrador(conexao, id);
    }

    await conexao.query('UPDATE usuario SET id_perfil = ? WHERE id_usuario = ?', [perfil.id_perfil, id]);
    const encerradas = await Sessao.encerrarDaConta(conexao, id, 'perfil_alterado');
    const depois = await buscar(conexao, id);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'perfil', entidade: 'usuario', idRegistro: id,
      dataEvento: dados.data_efetiva,
      descricao: `Conta ${depois.login}: perfil ${atual.perfil} → ${depois.perfil}` +
        (encerradas ? `; ${encerradas} sessão(ões) encerrada(s)` : ''),
      motivo: dados.motivo, antes: retrato(atual), depois: retrato(depois)
    });
    return depois;
  });
}

// Ativação e desativação. A desativação encerra as sessões na hora; a
// própria conta não pode ser desativada, nem o último Administrador ativo.
async function alterarSituacao(id, dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, { bloquear: true });
    if (atual.situacao === 'pendente') {
      throw AppError.conflito('Solicitações pendentes são aprovadas ou recusadas, não ativadas.');
    }
    if (atual.situacao === dados.situacao) {
      throw AppError.conflito(`A conta já está ${dados.situacao === 'ativo' ? 'ativa' : 'inativa'}.`);
    }
    if (dados.situacao === 'inativo') {
      if (id === idResponsavel) throw AppError.conflito('Você não pode desativar a sua própria conta.');
      if (atual.perfil === ADMINISTRADOR) await garantirOutroAdministrador(conexao, id);
    }

    await conexao.query('UPDATE usuario SET situacao = ? WHERE id_usuario = ?', [dados.situacao, id]);
    const encerradas = dados.situacao === 'inativo'
      ? await Sessao.encerrarDaConta(conexao, id, 'conta_inativada') : 0;
    const depois = await buscar(conexao, id);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: dados.situacao === 'ativo' ? 'reativacao' : 'inativacao',
      entidade: 'usuario', idRegistro: id,
      descricao: `Conta ${depois.login} ${dados.situacao === 'ativo' ? 'reativada' : 'desativada'}` +
        (encerradas ? `; ${encerradas} sessão(ões) encerrada(s)` : ''),
      motivo: dados.motivo, antes: retrato(atual), depois: retrato(depois)
    });
    return depois;
  });
}

// Redefinição pelo Administrador (Protótipo 13): gera senha provisória,
// obriga a troca no próximo acesso e encerra as sessões da conta.
async function definirSenhaProvisoria(id, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, { bloquear: true });
    if (atual.situacao !== 'ativo') throw AppError.conflito('Só contas ativas recebem senha provisória.');
    const senha = gerarSenhaProvisoria();
    await conexao.query(
      `UPDATE usuario SET senha_hash = ?, troca_senha_obrigatoria = TRUE, senha_alterada_em = NOW()
        WHERE id_usuario = ?`, [gerarHashSenha(senha), id]);
    await conexao.query('UPDATE recuperacao_senha SET usada_em = NOW() WHERE id_usuario = ? AND usada_em IS NULL', [id]);
    const encerradas = await Sessao.encerrarDaConta(conexao, id, 'senha_redefinida');
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'senha', entidade: 'usuario', idRegistro: id,
      descricao: `Conta ${atual.login}: senha provisória definida pelo Administrador` +
        (encerradas ? `; ${encerradas} sessão(ões) encerrada(s)` : '')
    });
    return { senha_provisoria: senha };
  });
}

// ---------------------------------------------------------------
// Perfis e permissões
// ---------------------------------------------------------------

// Perfis com suas permissões, e o catálogo de permissões (para a matriz)
async function listarPerfis() {
  const [perfis] = await pool.query(
    `SELECT p.id_perfil, p.nome, p.visualiza_dados_sensiveis,
            (SELECT COUNT(*) FROM usuario u WHERE u.id_perfil = p.id_perfil AND u.situacao = 'ativo') AS contas_ativas
       FROM perfil p ORDER BY p.id_perfil`);
  const [permissoes] = await pool.query(
    'SELECT codigo, descricao, grupo, exclusiva_administrador FROM permissao ORDER BY grupo, id_permissao');
  for (const perfil of perfis) {
    perfil.visualiza_dados_sensiveis = Boolean(perfil.visualiza_dados_sensiveis);
    perfil.permissoes = await permissoesDoPerfil(pool, perfil.id_perfil);
  }
  return {
    perfis,
    permissoes: permissoes.map((p) => ({ ...p, exclusiva_administrador: Boolean(p.exclusiva_administrador) }))
  };
}

// Definição das permissões do Operador (RF_B9). O Administrador tem sempre
// todas (RN21), e as exclusivas dele não podem ir para o Operador.
async function definirPermissoes(idPerfil, codigos, idResponsavel) {
  return comTransacao(async (conexao) => {
    const [[perfil]] = await conexao.query('SELECT id_perfil, nome FROM perfil WHERE id_perfil = ? FOR UPDATE', [idPerfil]);
    if (!perfil) throw AppError.naoEncontrado('Perfil não encontrado.');
    if (perfil.nome === ADMINISTRADOR) {
      throw AppError.conflito('O perfil Administrador tem sempre todas as permissões (RN21).');
    }
    const [catalogo] = await conexao.query('SELECT id_permissao, codigo, exclusiva_administrador FROM permissao');
    const porCodigo = new Map(catalogo.map((p) => [p.codigo, p]));
    const desconhecidas = codigos.filter((c) => !porCodigo.has(c));
    if (desconhecidas.length) throw AppError.campos({ permissoes: `Permissão inexistente: ${desconhecidas.join(', ')}.` });
    const exclusivas = codigos.filter((c) => porCodigo.get(c).exclusiva_administrador);
    if (exclusivas.length) {
      throw AppError.campos({ permissoes: `Exclusiva do Administrador (RN21): ${exclusivas.join(', ')}.` });
    }

    const antes = await permissoesDoPerfil(conexao, idPerfil);
    await conexao.query('DELETE FROM perfil_permissao WHERE id_perfil = ?', [idPerfil]);
    if (codigos.length) {
      await conexao.query('INSERT INTO perfil_permissao (id_perfil, id_permissao) VALUES ?',
        [codigos.map((c) => [idPerfil, porCodigo.get(c).id_permissao])]);
    }
    const depois = await permissoesDoPerfil(conexao, idPerfil);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'permissao', entidade: 'perfil', idRegistro: idPerfil,
      descricao: `Permissões do perfil ${perfil.nome} alteradas`,
      antes: { permissoes: antes }, depois: { permissoes: depois }
    });
    return depois;
  });
}

module.exports = {
  ADMINISTRADOR, OPERADOR,
  carregarAutenticado, buscarParaLogin, registrarAcesso, solicitarCadastro,
  alterarDadosProprios, alterarSenhaPropria,
  listar, buscarPorId, criar, atualizar, aprovar, rejeitar, alterarPerfil,
  alterarSituacao, definirSenhaProvisoria, listarPerfis, definirPermissoes
};
