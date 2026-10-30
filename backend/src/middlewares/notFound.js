// Nenhuma rota atendeu: responde 404 em JSON, no mesmo formato dos demais erros.

module.exports = function notFound(req, res) {
  res.status(404).json({ mensagem: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
};
