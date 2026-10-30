// Histórico de movimentações e auditoria (RF_S7): exclusivo do Administrador

import { requisicao, consultaFiltros } from './api';

export const listarHistorico = (filtros) => requisicao(`/api/historico${consultaFiltros(filtros)}`);
export const opcoesDoHistorico = () => requisicao('/api/historico/opcoes');
