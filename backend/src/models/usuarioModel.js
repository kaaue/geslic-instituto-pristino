// Model das contas de acesso (RF_B8): acesso ao banco e regras.
//
// Conta de acesso e colaborador são entidades separadas: um colaborador pode
// existir sem conta, e toda conta nova (criada ou aprovada pelo Administrador)
// fica ligada a um colaborador, que pode ser escolhido entre os existentes ou
// cadastrado no mesmo fluxo, na mesma transação. A conta "admin" inicial,
// criada pelos scripts, é a exceção. O perfil (Administrador ou Operador) e as permissões vêm sempre do
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
const { senhaProvisoriaHoras } = require('../config/env');
const Sessao = require('./sessaoModel');
const Historico = require('./historicoModel');

const ADMINISTRADOR = 'Administrador';
const OPERADOR = 'Operador';
const NAO_ENCONTRADA = 'Conta não encontrada.';

// Dados públicos da conta: nunca inclui senha_hash nem tokens. Não há
// registro de último acesso (RN41: só os dados técnicos da sessão).
const COLUNAS = `
    u.id_usuario, u.nome, u.login, u.email, u.situacao,
    u.troca_senha_obrigatoria, u.id_perfil, p.nome AS perfil,
    p.visualiza_dados_sensiveis, u.id_colaborador, c.nome AS nome_colaborador,
    c.id_setor, sc.nome AS nome_setor, c.cargo AS cargo_colaborador,
    u.cadastro_id_setor, scad.nome AS nome_setor_solicitado, u.cadastro_cargo,
    DATE_FORMAT(u.senha_provisoria_expira_em, '%Y-%m-%dT%H:%i:%s') AS senha_provisoria_expira_em,
    DATE_FORMAT(u.criada_em, '%Y-%m-%dT%H:%i:%s')   AS criada_em,
    DATE_FORMAT(u.aprovada_em, '%Y-%m-%dT%H:%i:%s') AS aprovada_em,
    ua.nome AS nome_aprovador`;

const TABELAS = `
    FROM usuario u
    JOIN perfil p           ON p.id_perfil = u.id_perfil
    LEFT JOIN colaborador c ON c.id_colaborador = u.id_colaborador
    LEFT JOIN usuario ua    ON ua.id_usuario = u.id_aprovador
    LEFT JOIN setor sc      ON sc.id_setor = c.id_setor
    LEFT JOIN setor scad    ON scad.id_setor = u.cadastro_id_setor`;

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

// Colaborador da conta: o escolhido (conferido acima) ou um novo, cadastrado
// agora, na mesma transação da conta. Nome repetido não identifica pessoa
// (RN19): com homônimo, a API pede confirmação (409 COLABORADOR_HOMONIMO) e
// mostra setor e situação de cada um, para o Administrador escolher o
// existente ou confirmar que é outra pessoa.
async function resolverColaborador(conexao, dados, email, idConta, erros) {
  if (dados.id_colaborador) {
    await conferirColaborador(conexao, dados.id_colaborador, idConta, null, erros);
    return dados.id_colaborador;
  }
  const novo = dados.colaborador_novo;
  if (!novo) {
    erros.id_colaborador = 'Selecione o colaborador da conta ou cadastre um novo.';
    return null;
  }
  const [[setor]] = await conexao.query('SELECT ativo FROM setor WHERE id_setor = ?', [novo.id_setor || 0]);
  if (!setor || !setor.ativo) erros.colaborador_id_setor = 'Selecione um setor ativo.';
  const [comEmail] = await conexao.query(
    'SELECT id_colaborador, nome FROM colaborador WHERE email = ?', [email]);
  if (comEmail.length) {
    erros.id_colaborador = `Já existe o colaborador ${comEmail[0].nome} com este e-mail: selecione-o.`;
  }
  if (Object.keys(erros).length) return null;

  if (!dados.confirmar_homonimo) {
    const [homonimos] = await conexao.query(
      `SELECT c.id_colaborador, c.nome, c.cargo, s.nome AS nome_setor, c.ativo,
              (SELECT COUNT(*) FROM usuario u WHERE u.id_colaborador = c.id_colaborador) AS tem_conta
         FROM colaborador c JOIN setor s ON s.id_setor = c.id_setor
        WHERE c.nome = ? ORDER BY c.ativo DESC`, [novo.nome]);
    if (homonimos.length) {
      throw AppError.conflito(
        `Já existe colaborador chamado ${novo.nome}. Selecione o cadastro existente ou confirme que é outra pessoa.`,
        'COLABORADOR_HOMONIMO',
        { homonimos: homonimos.map((h) => ({ ...h, ativo: Boolean(h.ativo), tem_conta: Boolean(h.tem_conta) })) });
    }
  }
  const [r] = await conexao.query(
    'INSERT INTO colaborador (nome, cargo, email, id_setor, ativo) VALUES (?, ?, ?, ?, TRUE)',
    [novo.nome, novo.cargo, email, novo.id_setor]);
  return r.insertId;
}

const prazoProvisoria = () => new Date(Date.now() + senhaProvisoriaHoras * 3600 * 1000);

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
    `SELECT id_usuario, situacao, senha_hash,
            (troca_senha_obrigatoria AND senha_provisoria_expira_em < NOW()) AS provisoria_expirada
       FROM usuario WHERE login = ? OR email = ? LIMIT 1`,
    [identificador, identificador]);
  return linhas[0] || null;
}

// Autocadastro: conta pendente, perfil Operador, sem colaborador. Setor e
// cargo informados ficam guardados no pedido; o colaborador só é criado (ou
// escolhido entre os existentes) na aprovação. Um pedido recusado com o mesmo
// e-mail é reaproveitado: volta a aguardar aprovação, com os dados novos
// (nada é apagado; a recusa anterior continua no histórico).
async function solicitarCadastro(dados) {
  return comTransacao(async (conexao) => {
    const erros = {};
    const [[recusado]] = await conexao.query(
      `SELECT id_usuario FROM usuario WHERE email = ? AND situacao = 'recusada' FOR UPDATE`, [dados.email]);
    await conferirUnicidade(conexao, dados, recusado?.id_usuario || null, erros);
    if (recusado) {
      const [[setor]] = await conexao.query('SELECT ativo FROM setor WHERE id_setor = ?', [dados.id_setor || 0]);
      if (!setor || !setor.ativo) erros.id_setor = 'Selecione o seu setor.';
      lancarSeHouverErros(erros);
      await conexao.query(
        `UPDATE usuario SET nome = ?, login = ?, senha_hash = ?, situacao = 'pendente', senha_alterada_em = NOW(),
                cadastro_id_setor = ?, cadastro_cargo = ?, criada_em = NOW()
          WHERE id_usuario = ?`,
        [dados.nome, dados.login, gerarHashSenha(dados.senha), dados.id_setor, dados.cargo, recusado.id_usuario]);
      return { id_usuario: recusado.id_usuario, reaproveitada: true };
    }
    const [[setor]] = await conexao.query('SELECT ativo FROM setor WHERE id_setor = ?', [dados.id_setor || 0]);
    if (!setor || !setor.ativo) erros.id_setor = 'Selecione o seu setor.';
    lancarSeHouverErros(erros);
    const [resultado] = await conexao.query(
      `INSERT INTO usuario (id_perfil, nome, login, email, senha_hash, situacao, senha_alterada_em,
                            cadastro_id_setor, cadastro_cargo)
       SELECT id_perfil, ?, ?, ?, ?, 'pendente', NOW(), ?, ? FROM perfil WHERE nome = ?`,
      [dados.nome, dados.login, dados.email, gerarHashSenha(dados.senha), dados.id_setor, dados.cargo, OPERADOR]);
    return { id_usuario: resultado.insertId };
  });
}

// ---------------------------------------------------------------
// Minha conta
// ---------------------------------------------------------------

// Dados da própria conta e, no mesmo bloco, a troca de senha (Protótipo 4):
// tudo numa transação. Com troca de senha, a atual é conferida e as outras
// sessões abertas da conta são encerradas.
async function alterarDadosProprios(idUsuario, dados, idSessaoAtual = null) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, idUsuario, { bloquear: true });
    const erros = {};
    await conferirUnicidade(conexao, { email: dados.email }, idUsuario, erros);
    lancarSeHouverErros(erros);
    const mudouDados = atual.nome !== dados.nome || atual.email !== dados.email;
    if (mudouDados) {
      await conexao.query('UPDATE usuario SET nome = ?, email = ? WHERE id_usuario = ?',
        [dados.nome, dados.email, idUsuario]);
      await Historico.registrar(conexao, {
        idUsuario, tipo: 'correcao', entidade: 'usuario', idRegistro: idUsuario,
        descricao: `Conta ${atual.login}: dados atualizados pela própria conta`,
        antes: retrato(atual), depois: retrato({ ...atual, nome: dados.nome, email: dados.email })
      });
    }
    let encerradas = null;
    if (dados.senha) encerradas = await trocarSenha(conexao, idUsuario, dados.senha_atual, dados.senha, idSessaoAtual);
    return { senha_alterada: Boolean(dados.senha), sessoes_encerradas: encerradas ?? 0 };
  });
}

// Troca da própria senha, após conferir a atual. Encerra as outras sessões
// da conta e mantém a atual.
async function trocarSenha(conexao, idUsuario, senhaAtual, novaSenha, idSessaoAtual) {
  const [[conta]] = await conexao.query(
    'SELECT login, senha_hash FROM usuario WHERE id_usuario = ? FOR UPDATE', [idUsuario]);
  if (!conta || !verificarSenha(senhaAtual, conta.senha_hash)) {
    throw AppError.campos({ senha_atual: 'A senha atual não confere.' });
  }
  if (verificarSenha(novaSenha, conta.senha_hash)) {
    throw AppError.campos({ senha: 'A nova senha deve ser diferente da atual.' });
  }
  await conexao.query(
    `UPDATE usuario SET senha_hash = ?, troca_senha_obrigatoria = FALSE, senha_provisoria_expira_em = NULL,
                        senha_alterada_em = NOW()
      WHERE id_usuario = ?`, [gerarHashSenha(novaSenha), idUsuario]);
  const encerradas = await Sessao.encerrarDaConta(conexao, idUsuario, 'troca_senha', idSessaoAtual);
  await Historico.registrar(conexao, {
    idUsuario, tipo: 'senha', entidade: 'usuario', idRegistro: idUsuario,
    descricao: `Conta ${conta.login}: senha alterada pela própria conta` +
      (encerradas ? `; ${encerradas} outra(s) sessão(ões) encerrada(s)` : '')
  });
  return encerradas;
}

// Troca só da senha (usada também na troca obrigatória da senha provisória)
async function alterarSenhaPropria(idUsuario, senhaAtual, novaSenha, idSessaoAtual) {
  return comTransacao((conexao) => trocarSenha(conexao, idUsuario, senhaAtual, novaSenha, idSessaoAtual));
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
  if (['pendente', 'recusada', 'ativo', 'inativo'].includes(filtros.situacao)) {
    condicoes.push('u.situacao = ?');
    valores.push(filtros.situacao);
  }
  // Setor do colaborador vinculado; no pedido pendente, o setor informado
  if (filtros.id_setor) {
    condicoes.push('(c.id_setor = ? OR (u.id_colaborador IS NULL AND u.cadastro_id_setor = ?))');
    valores.push(Number(filtros.id_setor), Number(filtros.id_setor));
  }
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} ${TABELAS}
      ${condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : ''}
      ORDER BY FIELD(u.situacao, 'pendente', 'ativo', 'inativo', 'recusada'), u.nome`, valores);
  return linhas.map(publico);
}

async function buscarPorId(id) {
  return buscarOuFalhar(pool, id);
}

// Conta criada pelo Administrador: já ativa, ligada a um colaborador
// (existente ou cadastrado agora), com senha provisória gerada pelo sistema,
// com prazo e troca obrigatória no primeiro acesso. A senha é devolvida uma
// única vez e nunca vai para o histórico.
async function criar(dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    const erros = {};
    const perfil = await perfilOuErro(conexao, dados.id_perfil, erros);
    await conferirUnicidade(conexao, dados, null, erros);
    lancarSeHouverErros(erros);
    exigirMotivoAoConcederAdmin(perfil, dados.motivo);
    const idColaborador = await resolverColaborador(conexao, dados, dados.email, null, erros);
    lancarSeHouverErros(erros);

    const senha = gerarSenhaProvisoria();
    const [resultado] = await conexao.query(
      `INSERT INTO usuario
         (id_perfil, id_colaborador, nome, login, email, senha_hash, situacao, troca_senha_obrigatoria,
          senha_provisoria_expira_em)
       VALUES (?, ?, ?, ?, ?, ?, 'ativo', TRUE, ?)`,
      [perfil.id_perfil, idColaborador, dados.nome, dados.login, dados.email, gerarHashSenha(senha),
       prazoProvisoria()]);
    const conta = await buscar(conexao, resultado.insertId);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'criacao', entidade: 'usuario', idRegistro: conta.id_usuario,
      descricao: `Conta ${conta.login} criada com perfil ${conta.perfil}, ligada ao colaborador ` +
        `${conta.nome_colaborador}${dados.colaborador_novo ? ' (cadastrado junto com a conta)' : ''}`,
      motivo: dados.motivo, depois: retrato(conta)
    });
    return { conta, senha_provisoria: senha, senha_expira_em: conta.senha_provisoria_expira_em };
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
    lancarSeHouverErros(erros);
    exigirMotivoAoConcederAdmin(perfil, dados.motivo);
    if (dados.colaborador_novo && !dados.colaborador_novo.nome) dados.colaborador_novo.nome = atual.nome;
    const idColaborador = await resolverColaborador(conexao, dados, atual.email, id, erros);
    lancarSeHouverErros(erros);

    await conexao.query(
      `UPDATE usuario SET situacao = 'ativo', id_perfil = ?, id_colaborador = ?, id_aprovador = ?, aprovada_em = NOW()
        WHERE id_usuario = ?`,
      [perfil.id_perfil, idColaborador, idResponsavel, id]);
    const depois = await buscar(conexao, id);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'aprovacao', entidade: 'usuario', idRegistro: id,
      descricao: `Solicitação de acesso de ${depois.login} aprovada com perfil ${depois.perfil}, ` +
        `ligada ao colaborador ${depois.nome_colaborador}${dados.colaborador_novo ? ' (cadastrado na aprovação)' : ''}`,
      motivo: dados.motivo, antes: retrato(atual), depois: retrato(depois)
    });
    return depois;
  });
}

// A solicitação recusada nunca teve acesso e é preservada na situação
// "recusada" (RN22): continua consultável, não entra no sistema, e uma nova
// solicitação com o mesmo e-mail a reaproveita. A recusa fica no histórico.
async function rejeitar(id, motivo, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, { bloquear: true });
    if (atual.situacao !== 'pendente') {
      throw AppError.conflito('Só solicitações pendentes podem ser recusadas. Para tirar o acesso, inative a conta.');
    }
    await conexao.query(`UPDATE usuario SET situacao = 'recusada' WHERE id_usuario = ?`, [id]);
    const depois = await buscar(conexao, id);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'rejeicao', entidade: 'usuario', idRegistro: id,
      descricao: `Solicitação de acesso de ${atual.login} recusada`, motivo, antes: retrato(atual), depois: retrato(depois)
    });
    return depois;
  });
}

// Concessão e revogação de perfil (RN27)
async function alterarPerfil(id, dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    const atual = await buscarOuFalhar(conexao, id, { bloquear: true });
    if (atual.situacao === 'pendente' || atual.situacao === 'recusada') {
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
    if (atual.situacao === 'pendente' || atual.situacao === 'recusada') {
      throw AppError.conflito('Solicitações de acesso são aprovadas ou recusadas, não ativadas.');
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
      `UPDATE usuario SET senha_hash = ?, troca_senha_obrigatoria = TRUE, senha_provisoria_expira_em = ?,
                          senha_alterada_em = NOW()
        WHERE id_usuario = ?`, [gerarHashSenha(senha), prazoProvisoria(), id]);
    await conexao.query('UPDATE recuperacao_senha SET usada_em = NOW() WHERE id_usuario = ? AND usada_em IS NULL', [id]);
    const encerradas = await Sessao.encerrarDaConta(conexao, id, 'senha_redefinida');
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'senha', entidade: 'usuario', idRegistro: id,
      descricao: `Conta ${atual.login}: senha provisória definida pelo Administrador` +
        (encerradas ? `; ${encerradas} sessão(ões) encerrada(s)` : '')
    });
    const [[prazo]] = await conexao.query(
      `SELECT DATE_FORMAT(senha_provisoria_expira_em, '%Y-%m-%dT%H:%i:%s') AS expira FROM usuario WHERE id_usuario = ?`, [id]);
    return { senha_provisoria: senha, senha_expira_em: prazo.expira };
  });
}

// ---------------------------------------------------------------
// Perfis e permissões
// ---------------------------------------------------------------

// Matriz explicativa e não editável (Protótipo 13.2; RN21, RN41): cada linha
// é uma operação do dia a dia, ligada às permissões que a API exige. O
// "permitido" de cada perfil vem das permissões reais no banco, para a
// matriz nunca dizer uma coisa e a API fazer outra.
const MATRIZ = [
  { operacao: 'Consultar licenças, apólices, projetos e cadastros nos módulos (consulta operacional)',
    codigos: ['cadastro.consultar', 'licenca.consultar', 'apolice.consultar'] },
  { operacao: 'Incluir cadastros, registrar licenças e apólices e realizar movimentações',
    codigos: ['cadastro.incluir', 'licenca.registrar', 'apolice.registrar', 'licenca.movimentar'] },
  { operacao: 'Informar participantes ao criar projeto', codigos: ['cadastro.incluir'] },
  { operacao: 'Inativar cadastros com data efetiva, prorrogar e encerrar projetos',
    codigos: ['cadastro.inativar', 'projeto.prorrogar', 'projeto.encerrar'] },
  { operacao: 'Alterar participantes de projeto existente', codigos: ['cadastro.alterar'],
    nao: { Operador: 'solicita ajuste' } },
  { operacao: 'Alterar dados cadastrais, reativar e desligar colaboradores', codigos: ['cadastro.alterar'],
    nao: { Operador: 'solicita ajuste' } },
  { operacao: 'Registrar resultado de autorização', codigos: ['autorizacao.registrar'] },
  { operacao: 'Emitir autorização operacional', codigos: ['autorizacao.emitir'] },
  { operacao: 'Emitir solicitação de ajuste cadastral', codigos: ['ajuste.solicitar'],
    nao: { Administrador: 'corrige diretamente' } },
  { operacao: 'Corrigir o cadastro e concluir solicitação de ajuste', codigos: ['cadastro.alterar', 'ajuste.concluir'] },
  { operacao: 'Relatórios (RF_S2 a RF_S6) e histórico de auditoria (RF_S7)', codigos: ['relatorio.consultar', 'auditoria.consultar'] },
  { operacao: 'Gerenciar usuários · aprovar solicitações de acesso', codigos: ['usuario.gerenciar'] }
];

async function listarPerfis() {
  const [perfis] = await pool.query(
    `SELECT p.id_perfil, p.nome, p.visualiza_dados_sensiveis,
            (SELECT COUNT(*) FROM usuario u WHERE u.id_perfil = p.id_perfil AND u.situacao = 'ativo') AS contas_ativas
       FROM perfil p ORDER BY p.id_perfil`);
  for (const perfil of perfis) {
    perfil.visualiza_dados_sensiveis = Boolean(perfil.visualiza_dados_sensiveis);
    perfil.permissoes = await permissoesDoPerfil(pool, perfil.id_perfil);
  }
  const matriz = MATRIZ.map((linha) => ({
    operacao: linha.operacao,
    perfis: Object.fromEntries(perfis.map((p) => [p.nome, {
      permitido: linha.codigos.every((c) => p.permissoes.includes(c)),
      observacao: linha.nao?.[p.nome] || null
    }]))
  }));
  return { perfis, matriz, editavel: false };
}

// Troca de gestão numa única operação (Protótipo 13.1, RN27): concede o
// perfil Administrador a uma conta e revoga de outra, que passa a Operador ou
// é inativada. Exige data efetiva e motivo, encerra as sessões das duas
// contas e fica no histórico. Como uma conta ganha o perfil enquanto a outra
// perde, sempre sobra ao menos um Administrador ativo.
async function transferirAdministrador(dados, idResponsavel) {
  return comTransacao(async (conexao) => {
    const concedida = await buscarOuFalhar(conexao, dados.id_concedida, { bloquear: true });
    const revogada = await buscarOuFalhar(conexao, dados.id_revogada, { bloquear: true });
    if (concedida.situacao !== 'ativo') throw AppError.campos({ id_concedida: 'A conta da nova gestora precisa estar ativa.' });
    if (concedida.perfil === ADMINISTRADOR) throw AppError.campos({ id_concedida: 'Esta conta já é Administrador.' });
    if (revogada.perfil !== ADMINISTRADOR || revogada.situacao !== 'ativo') {
      throw AppError.campos({ id_revogada: 'Escolha um Administrador ativo para revogar.' });
    }
    const [[admin]] = await conexao.query('SELECT id_perfil FROM perfil WHERE nome = ?', [ADMINISTRADOR]);
    const [[operador]] = await conexao.query('SELECT id_perfil FROM perfil WHERE nome = ?', [OPERADOR]);

    await conexao.query('UPDATE usuario SET id_perfil = ? WHERE id_usuario = ?', [admin.id_perfil, concedida.id_usuario]);
    if (dados.destino_revogada === 'inativar') {
      await conexao.query(`UPDATE usuario SET situacao = 'inativo' WHERE id_usuario = ?`, [revogada.id_usuario]);
    } else {
      await conexao.query('UPDATE usuario SET id_perfil = ? WHERE id_usuario = ?', [operador.id_perfil, revogada.id_usuario]);
    }
    await Sessao.encerrarDaConta(conexao, concedida.id_usuario, 'perfil_alterado');
    await Sessao.encerrarDaConta(conexao, revogada.id_usuario, dados.destino_revogada === 'inativar' ? 'conta_inativada' : 'perfil_alterado');
    await garantirOutroAdministrador(conexao, null);

    const concedidaDepois = await buscar(conexao, concedida.id_usuario);
    const revogadaDepois = await buscar(conexao, revogada.id_usuario);
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: 'perfil', entidade: 'usuario', idRegistro: concedida.id_usuario,
      dataEvento: dados.data_efetiva, motivo: dados.motivo,
      descricao: `Transferência de privilégios: ${concedida.login} recebe o perfil Administrador de ${revogada.login}`,
      antes: retrato(concedida), depois: retrato(concedidaDepois)
    });
    await Historico.registrar(conexao, {
      idUsuario: idResponsavel, tipo: dados.destino_revogada === 'inativar' ? 'inativacao' : 'perfil',
      entidade: 'usuario', idRegistro: revogada.id_usuario, dataEvento: dados.data_efetiva, motivo: dados.motivo,
      descricao: `Transferência de privilégios: ${revogada.login} ` +
        (dados.destino_revogada === 'inativar'
          ? 'deixa de ser Administrador e tem a conta desativada'
          : 'passa a Operador e continua ativa') + ` (privilégios para ${concedida.login})`,
      antes: retrato(revogada), depois: retrato(revogadaDepois)
    });
    return { concedida: concedidaDepois, revogada: revogadaDepois };
  });
}

module.exports = {
  ADMINISTRADOR, OPERADOR,
  carregarAutenticado, buscarParaLogin, solicitarCadastro,
  alterarDadosProprios, alterarSenhaPropria,
  listar, buscarPorId, criar, atualizar, aprovar, rejeitar, alterarPerfil,
  alterarSituacao, definirSenhaProvisoria, listarPerfis, transferirAdministrador
};
