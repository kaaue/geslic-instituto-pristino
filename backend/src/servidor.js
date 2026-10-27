// Servidor da API do GESLIC.
// Cada função básica tem seu arquivo de rotas: RF_B3 (equipamentos) e
// RF_B6 (projetos) até aqui.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pool = require('./banco');
const rotasEquipamentos = require('./rotas/equipamentos');
const rotasProjetos = require('./rotas/projetos');
const rotasApoio = require('./rotas/apoio');

const app = express();

// O front roda em outra porta durante o desenvolvimento, por isso o CORS
app.use(cors());
app.use(express.json());

app.use('/api/equipamentos', rotasEquipamentos);
app.use('/api/projetos', rotasProjetos);
app.use('/api', rotasApoio);

// Rota simples para conferir se a API e o banco estão de pé
app.get('/api/saude', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ api: 'ok', banco: 'ok' });
  } catch (erro) {
    res.status(500).json({ api: 'ok', banco: 'erro', detalhe: erro.message });
  }
});

// Tratamento de erro central: evita repetir try/catch com resposta em cada rota
app.use((erro, req, res, proximo) => {
  console.error(erro);
  res.status(500).json({ mensagem: 'Erro interno no servidor.' });
});

const porta = Number(process.env.PORTA) || 3001;
app.listen(porta, () => {
  console.log(`API do GESLIC rodando em http://localhost:${porta}`);
});
