// Peças comuns aos cadastros das funções básicas (RF_B1 a RF_B7).
//
// RN22: cadastro com vínculos não é excluído, nem pelo Administrador; o
// caminho é inativar, com data efetiva (RN37), para tirá-lo das listas de
// novos registros sem apagar o histórico. As consultas de vínculo de cada
// cadastro ficam no model dele; aqui só a contagem e a mensagem.

const AppError = require('../utils/AppError');

// consultas: [{ sql: 'SELECT COUNT(*) AS total FROM ... WHERE x = ?', singular, plural }]
// Devolve só os vínculos que existem: [{ total, texto: '2 licenças' }]
async function contarVinculos(conexao, consultas, id) {
  const encontrados = [];
  for (const { sql, singular, plural } of consultas) {
    const [[{ total }]] = await conexao.query(sql, [id]);
    if (total > 0) encontrados.push({ total, texto: `${total} ${total === 1 ? singular : plural}` });
  }
  return encontrados;
}

// "1 licença", "1 licença e 2 apólices", "1 licença, 2 apólices e 3 itens"
function juntar(textos) {
  if (textos.length <= 1) return textos.join('');
  return `${textos.slice(0, -1).join(', ')} e ${textos.at(-1)}`;
}

// Recusa a exclusão quando há vínculos, dizendo quais (RN22)
async function bloquearExclusaoComVinculos(conexao, consultas, id, artigoENome) {
  const vinculos = await contarVinculos(conexao, consultas, id);
  if (vinculos.length) {
    throw AppError.conflito(
      `Exclusão bloqueada: ${artigoENome} tem ${juntar(vinculos.map((v) => v.texto))} ` +
      'vinculado(s). Para retirá-lo das listas de novos cadastros, inative-o com data efetiva (RN22, RN37).',
      'CADASTRO_COM_VINCULOS',
      { vinculos: vinculos.map((v) => v.texto) });
  }
}

const sim = (valor) => valor === true || valor === 1 || valor === '1' || valor === 'true';

module.exports = { contarVinculos, bloquearExclusaoComVinculos, juntar, sim };
