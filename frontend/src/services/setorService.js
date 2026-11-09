// RF_B5 Gerenciar setores

import { requisicao, servicoDeCadastro } from './api';

// Setores ativos, para as listas de seleção das outras telas
export function listarSetores() {
  return requisicao('/api/setores/ativos');
}

export const setorCadastro = servicoDeCadastro('/api/setores');
