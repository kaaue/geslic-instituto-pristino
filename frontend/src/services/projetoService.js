// RF_B6 - Gerenciar projetos institucionais

import { requisicao, consultaFiltros, enviarJson } from './api';

export function listarProjetos(filtros) {
  return requisicao(`/api/projetos${consultaFiltros(filtros)}`);
}

// Um projeto, com a lista dos colaboradores participantes
export function buscarProjeto(id) {
  return requisicao(`/api/projetos/${id}`);
}

export function listarFontesFinanciadoras() {
  return requisicao('/api/projetos/fontes');
}

export function incluirProjeto(dados) {
  return requisicao('/api/projetos', enviarJson('POST', dados));
}

export function alterarProjeto(id, dados) {
  return requisicao(`/api/projetos/${id}`, enviarJson('PUT', dados));
}

export function excluirProjeto(id) {
  return requisicao(`/api/projetos/${id}`, { method: 'DELETE' });
}

export function encerrarProjeto(id, dataEncerramento) {
  return requisicao(`/api/projetos/${id}/encerramento`,
    enviarJson('POST', { data_encerramento: dataEncerramento }));
}

export function prorrogarProjeto(id, novoTermino) {
  return requisicao(`/api/projetos/${id}/prorrogacao`,
    enviarJson('POST', { data_fim_prevista: novoTermino }));
}
