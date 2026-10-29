// RF_B3 - Gerenciar equipamentos

import { requisicao, consultaFiltros, enviarJson } from './api';

export function listarEquipamentos(filtros) {
  return requisicao(`/api/equipamentos${consultaFiltros(filtros)}`);
}

export function incluirEquipamento(dados) {
  return requisicao('/api/equipamentos', enviarJson('POST', dados));
}

export function alterarEquipamento(id, dados) {
  return requisicao(`/api/equipamentos/${id}`, enviarJson('PUT', dados));
}

export function excluirEquipamento(id) {
  return requisicao(`/api/equipamentos/${id}`, { method: 'DELETE' });
}

// Instâncias alocadas que a inativação afetaria (RN08)
export function previaInativacao(id) {
  return requisicao(`/api/equipamentos/${id}/previa-inativacao`);
}
