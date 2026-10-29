import { requisicao } from './api';

// Colaboradores ativos, para as listas de seleção
export function listarColaboradores() {
  return requisicao('/api/colaboradores');
}
