// RF_B5 Gerenciar setores

import { requisicao, servicoDeCadastro } from './api';

// Setores ativos, para as listas de seleção (implementado)
export function listarSetores() {
  return requisicao('/api/setores');
}

// Cadastro completo (em desenvolvimento: a API responde 501)
export const setorCadastro = servicoDeCadastro('/api/setores');
