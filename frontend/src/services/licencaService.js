// Licenças de software: RF_F1 a RF_F6 e RF_S2 (em desenvolvimento: a API responde 501)

import { requisicao, consultaFiltros, enviarJson } from './api';

export const listarLicencas = (filtros = {}) => requisicao(`/api/licencas${consultaFiltros(filtros)}`);
export const registrarLicenca = (dados) => requisicao('/api/licencas', enviarJson('POST', dados));
// A chave só é revelada a perfis com permissão de ver dados sensíveis
export const revelarChave = (id) => requisicao(`/api/licencas/${id}/chave`);
