// Tratamento de erro central: evita repetir try/catch com resposta em cada rota.
// AppError vira a resposta que ele descreve; qualquer outro erro é falha
// inesperada, registrada no console e respondida com 500 sem detalhes.

const AppError = require('../utils/AppError');

// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(erro, req, res, proximo) {
  if (erro instanceof AppError) {
    const corpo = erro.erros ? { erros: erro.erros } : { mensagem: erro.message };
    if (erro.codigo) corpo.codigo = erro.codigo;
    return res.status(erro.status).json(corpo);
  }

  // JSON malformado ou grande demais no corpo da requisição
  if (erro.type === 'entity.parse.failed') {
    return res.status(400).json({ mensagem: 'Corpo da requisição inválido.' });
  }
  if (erro.type === 'entity.too.large') {
    return res.status(413).json({ mensagem: 'Corpo da requisição grande demais.' });
  }

  console.error(erro);
  res.status(500).json({ mensagem: 'Erro interno no servidor.' });
};
