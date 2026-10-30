// Recuperação de senha por e-mail.
//
// O token vai só no link enviado por e-mail; o banco guarda o SHA-256 dele,
// com validade curta e uso único. Um pedido novo invalida os anteriores da
// mesma conta. Redefinir a senha consome o token, encerra todas as sessões da
// conta e tira a obrigação de troca de senha provisória.

const { pool, comTransacao } = require('../config/database');
const { recuperacao } = require('../config/env');
const AppError = require('../utils/AppError');
const { gerarToken, hashToken, gerarHashSenha } = require('../utils/senha');
const Sessao = require('./sessaoModel');
const Historico = require('./historicoModel');

// Conta ativa com este e-mail, ou null (contas pendentes e inativas não recuperam)
async function contaAtivaPorEmail(email) {
  const [linhas] = await pool.query(
    `SELECT id_usuario, nome, login, email FROM usuario WHERE email = ? AND situacao = 'ativo'`, [email]);
  return linhas[0] || null;
}

// Cria o pedido e devolve o token (só para montar o link do e-mail)
async function criarPedido(idUsuario) {
  return comTransacao(async (conexao) => {
    await conexao.query(
      'UPDATE recuperacao_senha SET usada_em = NOW() WHERE id_usuario = ? AND usada_em IS NULL', [idUsuario]);
    const token = gerarToken();
    await conexao.query(
      `INSERT INTO recuperacao_senha (id_usuario, token_hash, expira_em)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [idUsuario, hashToken(token), recuperacao.validadeMinutos]);
    return token;
  });
}

const LINK_INVALIDO = 'Este link de redefinição é inválido, já foi usado ou expirou. Solicite um novo.';

async function redefinir(token, novaSenha) {
  return comTransacao(async (conexao) => {
    // Consome o token numa única instrução: dois envios simultâneos não usam o mesmo link
    const [consumo] = await conexao.query(
      `UPDATE recuperacao_senha r JOIN usuario u ON u.id_usuario = r.id_usuario
          SET r.usada_em = NOW()
        WHERE r.token_hash = ? AND r.usada_em IS NULL AND r.expira_em > NOW() AND u.situacao = 'ativo'`,
      [hashToken(token)]);
    if (consumo.affectedRows === 0) throw new AppError(LINK_INVALIDO, 400, null, 'TOKEN_INVALIDO');

    const [[conta]] = await conexao.query(
      `SELECT u.id_usuario, u.login FROM recuperacao_senha r JOIN usuario u ON u.id_usuario = r.id_usuario
        WHERE r.token_hash = ?`, [hashToken(token)]);
    await conexao.query(
      `UPDATE usuario SET senha_hash = ?, troca_senha_obrigatoria = FALSE, senha_alterada_em = NOW()
        WHERE id_usuario = ?`, [gerarHashSenha(novaSenha), conta.id_usuario]);
    const encerradas = await Sessao.encerrarDaConta(conexao, conta.id_usuario, 'senha_redefinida');
    await Historico.registrar(conexao, {
      idUsuario: conta.id_usuario, tipo: 'senha', entidade: 'usuario', idRegistro: conta.id_usuario,
      descricao: `Conta ${conta.login}: senha redefinida pelo link de recuperação` +
        (encerradas ? `; ${encerradas} sessão(ões) encerrada(s)` : '')
    });
  });
}

module.exports = { contaAtivaPorEmail, criarPedido, redefinir };
