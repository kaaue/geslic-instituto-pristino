// Minha conta (RF_B8) e preferências de notificação (RF_B9)

import { requisicao, enviarJson } from './api';

// Dados da conta e, se vierem, a troca de senha: um único bloco (Protótipo 4)
export const atualizarMinhaConta = (dados) => requisicao('/api/conta', enviarJson('PUT', dados));
// Só a troca de senha (troca obrigatória da senha provisória)
export const alterarMinhaSenha = (dados) => requisicao('/api/conta/senha', enviarJson('PUT', dados));
export const consultarPreferencias = () => requisicao('/api/conta/preferencias');
export const salvarPreferencias = (preferencias) => requisicao('/api/conta/preferencias', enviarJson('PUT', { preferencias }));
