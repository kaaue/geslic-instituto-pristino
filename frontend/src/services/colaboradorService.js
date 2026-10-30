// RF_B4 Gerenciar colaboradores

import { requisicao, servicoDeCadastro } from './api';

// Colaboradores ativos, para as listas de seleção (implementado)
export function listarColaboradores() {
  return requisicao('/api/colaboradores');
}

// Cadastro completo, com desligamento (em desenvolvimento: a API responde 501)
export const colaboradorCadastro = servicoDeCadastro('/api/colaboradores', 'desligamento');
