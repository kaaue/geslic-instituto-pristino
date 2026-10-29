import { requisicao } from './api';

// Setores ativos, para as listas de seleção
export function listarSetores() {
  return requisicao('/api/setores');
}
