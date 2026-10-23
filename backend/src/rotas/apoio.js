// Rotas de apoio: alimentam as listas de seleção da tela de equipamentos.

const express = require('express');
const pool = require('../banco');

const rotas = express.Router();

rotas.get('/setores', async (req, res, proximo) => {
  try {
    const [linhas] = await pool.query(
      'SELECT id_setor, nome FROM setor WHERE ativo = TRUE ORDER BY nome');
    res.json(linhas);
  } catch (erro) {
    proximo(erro);
  }
});

rotas.get('/colaboradores', async (req, res, proximo) => {
  try {
    // Só colaboradores ativos podem ser responsáveis por um equipamento
    const [linhas] = await pool.query(
      `SELECT c.id_colaborador, c.nome, c.cargo, s.nome AS nome_setor
         FROM colaborador c
         JOIN setor s ON s.id_setor = c.id_setor
        WHERE c.ativo = TRUE
        ORDER BY c.nome`);
    res.json(linhas);
  } catch (erro) {
    proximo(erro);
  }
});

module.exports = rotas;
