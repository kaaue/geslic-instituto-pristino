// Painel (RF_S1) e relatórios RF_S2 a RF_S6 (em desenvolvimento: a API responde 501)

import { requisicao, consultaFiltros } from './api';

export const consultarPainel = () => requisicao('/api/painel');
export const relatorio = (nome, filtros = {}) => requisicao(`/api/relatorios/${nome}${consultaFiltros(filtros)}`);
