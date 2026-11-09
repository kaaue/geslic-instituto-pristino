// Autenticação (públicas: login, solicitação de acesso e recuperação de senha)

import { requisicao, enviarJson } from './api';

export const entrar = (login, senha) => requisicao('/api/auth/login', enviarJson('POST', { login, senha }));
export const sair = () => requisicao('/api/auth/logout', { method: 'POST' });
export const contaAtual = () => requisicao('/api/auth/me');
export const solicitarAcesso = (dados) => requisicao('/api/auth/cadastro', enviarJson('POST', dados));
export const solicitarRecuperacao = (email) => requisicao('/api/auth/recuperacao', enviarJson('POST', { email }));
export const redefinirSenha = (token, senha, confirmacao) =>
  requisicao('/api/auth/redefinicao', enviarJson('POST', { token, senha, confirmacao }));
