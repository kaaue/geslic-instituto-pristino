// Minha conta (RF_B8) e preferências de notificação (RF_B9)

import { requisicao, enviarJson } from './api';

export const atualizarMeusDados = (dados) => requisicao('/api/conta', enviarJson('PUT', dados));
export const alterarMinhaSenha = (dados) => requisicao('/api/conta/senha', enviarJson('PUT', dados));
// RF_B9: em desenvolvimento (a API responde 501)
export const consultarPreferencias = () => requisicao('/api/conta/preferencias');
export const salvarPreferencias = (dados) => requisicao('/api/conta/preferencias', enviarJson('PUT', dados));
