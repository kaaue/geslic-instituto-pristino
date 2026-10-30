// Sessões de acesso, guardadas no servidor.
//
// O token vai para o navegador num cookie HttpOnly; o banco guarda só o
// SHA-256 dele. Uma sessão vale enquanto não foi encerrada, não passou da
// validade máxima e não ficou parada além do limite de inatividade. Encerrar
// uma sessão (logout) ou todas as de uma conta (desativação, troca de perfil,
// redefinição de senha) tem efeito na requisição seguinte, porque toda
// requisição confere a sessão no banco.

const { pool } = require('../config/database');
const { sessao: config } = require('../config/env');
const { gerarToken, hashToken } = require('../utils/senha');

// Evita gravar a cada requisição: o último uso é atualizado no máximo uma vez por minuto
const INTERVALO_TOQUE_SEGUNDOS = 60;

async function criar(conexao, idUsuario) {
  const token = gerarToken();
  await conexao.query(
    `INSERT INTO sessao (id_usuario, token_hash, expira_em)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))`,
    [idUsuario, hashToken(token), config.duracaoHoras]);
  return token;
}

// Devolve { idSessao, idUsuario } da sessão válida, ou null.
// Sessão vencida por inatividade ou validade é encerrada aqui mesmo.
async function validar(token) {
  if (!token) return null;
  const [linhas] = await pool.query(
    `SELECT id_sessao, id_usuario, encerrada_em,
            expira_em <= NOW() AS vencida,
            ultimo_uso_em <= DATE_SUB(NOW(), INTERVAL ? MINUTE) AS ociosa,
            ultimo_uso_em <= DATE_SUB(NOW(), INTERVAL ? SECOND) AS tocar
       FROM sessao WHERE token_hash = ?`,
    [config.inatividadeMinutos, INTERVALO_TOQUE_SEGUNDOS, hashToken(token)]);
  const s = linhas[0];
  if (!s || s.encerrada_em) return null;
  if (s.vencida || s.ociosa) {
    await encerrar(s.id_sessao, s.vencida ? 'validade' : 'inatividade');
    return null;
  }
  if (s.tocar) {
    await pool.query('UPDATE sessao SET ultimo_uso_em = NOW() WHERE id_sessao = ?', [s.id_sessao]);
  }
  return { idSessao: s.id_sessao, idUsuario: s.id_usuario };
}

async function encerrar(idSessao, motivo) {
  await pool.query(
    `UPDATE sessao SET encerrada_em = NOW(), motivo_encerramento = ?
      WHERE id_sessao = ? AND encerrada_em IS NULL`,
    [motivo, idSessao]);
}

// Encerra todas as sessões abertas da conta, menos (opcionalmente) a atual
async function encerrarDaConta(conexao, idUsuario, motivo, exceto = null) {
  const [resultado] = await conexao.query(
    `UPDATE sessao SET encerrada_em = NOW(), motivo_encerramento = ?
      WHERE id_usuario = ? AND encerrada_em IS NULL AND id_sessao <> ?`,
    [motivo, idUsuario, exceto || 0]);
  return resultado.affectedRows;
}

module.exports = { criar, validar, encerrar, encerrarDaConta };
