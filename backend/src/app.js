// Configuração do Express: middlewares, rotas e tratamento de erros.
// Fica separado do server.js para a aplicação poder ser usada sem subir a
// porta (em testes, por exemplo).

const express = require('express');
const cors = require('cors');

const rotas = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// O front roda em outra porta durante o desenvolvimento, por isso o CORS
app.use(cors());
app.use(express.json());

app.use('/api', rotas);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
