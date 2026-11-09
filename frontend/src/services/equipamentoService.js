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

// Instâncias alocadas que a inativação afetaria (RN08)
export function previaInativacao(id) {
  return requisicao(`/api/equipamentos/${id}/previa-inativacao`);
}

// Inativação (descarte) como ação própria, permitida ao Operador (RN21, RN08),
// com data efetiva e motivo (RN37)
export function inativarEquipamento(id, evento) {
  return requisicao(`/api/equipamentos/${id}/inativacao`, enviarJson('POST', evento));
}

// Reativação (correção de um descarte registrado por engano), só do Administrador
export function reativarEquipamento(id) {
  return requisicao(`/api/equipamentos/${id}/reativacao`, { method: 'POST' });
}
