// RF_B4 Gerenciar colaboradores

import { requisicao, servicoDeCadastro, consultaFiltros } from './api';

// Colaboradores ativos, para as listas de seleção das outras telas
export function listarColaboradores() {
  return requisicao('/api/colaboradores/ativos');
}

// Cadastro completo; o desligamento (com data efetiva) é do Administrador
export const colaboradorCadastro = {
  ...servicoDeCadastro('/api/colaboradores', 'desligamento'),
  homonimos: (nome, exceto) => requisicao(`/api/colaboradores/homonimos${consultaFiltros({ nome, exceto })}`),
  previaDesligamento: (id) => requisicao(`/api/colaboradores/${id}/previa-desligamento`)
};
