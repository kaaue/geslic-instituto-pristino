// Contas e perfis de acesso (RF_B9): exclusivo do Administrador

import { requisicao, consultaFiltros, enviarJson } from './api';

export const listarContas = (filtros) => requisicao(`/api/usuarios${consultaFiltros(filtros)}`);
export const criarConta = (dados) => requisicao('/api/usuarios', enviarJson('POST', dados));
export const atualizarConta = (id, dados) => requisicao(`/api/usuarios/${id}`, enviarJson('PUT', dados));
export const aprovarConta = (id, dados) => requisicao(`/api/usuarios/${id}/aprovacao`, enviarJson('POST', dados));
export const recusarConta = (id, motivo) => requisicao(`/api/usuarios/${id}/rejeicao`, enviarJson('POST', { motivo }));
export const alterarPerfil = (id, dados) => requisicao(`/api/usuarios/${id}/perfil`, enviarJson('PATCH', dados));
export const alterarSituacao = (id, situacao, motivo) =>
  requisicao(`/api/usuarios/${id}/situacao`, enviarJson('PATCH', { situacao, motivo }));
export const definirSenhaProvisoria = (id) => requisicao(`/api/usuarios/${id}/senha-provisoria`, { method: 'POST' });

export const listarPerfis = () => requisicao('/api/perfis');
export const definirPermissoes = (idPerfil, permissoes) =>
  requisicao(`/api/perfis/${idPerfil}/permissoes`, enviarJson('PUT', { permissoes }));
