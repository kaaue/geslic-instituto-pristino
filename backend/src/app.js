// Configuração do Express: middlewares, rotas e tratamento de erros.
// Fica separado do server.js para a aplicação poder ser usada sem subir a
// porta (nos testes automatizados, por exemplo).

const express = require('express');
const cors = require('cors');

const { frontendUrl } = require('./config/env');
const rotas = require('./routes');
const conferirOrigem = require('./middlewares/origem');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// Em desenvolvimento o Vite encaminha /api para cá (mesma origem). O CORS
// fica restrito à interface configurada, com cookies, para quem acessa a
// API direto de outra porta.
app.use(cors({ origin: frontendUrl, credentials: true }));
app.disable('x-powered-by');
app.use((req, res, proximo) => {
  // A API só devolve JSON: proíbe que outro site a coloque num frame
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Cache-Control', 'no-store');
  proximo();
});
app.use(express.json({ limit: '100kb' }));
app.use(conferirOrigem);

app.use('/api', rotas);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
