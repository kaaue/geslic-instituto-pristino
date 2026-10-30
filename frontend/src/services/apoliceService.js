// Apólices de seguro: RF_F7 a RF_F10 e RF_S4 (em desenvolvimento: a API responde 501)

import { requisicao, consultaFiltros, enviarJson } from './api';

export const listarApolices = (filtros = {}) => requisicao(`/api/apolices${consultaFiltros(filtros)}`);
export const registrarApolice = (dados) => requisicao('/api/apolices', enviarJson('POST', dados));
