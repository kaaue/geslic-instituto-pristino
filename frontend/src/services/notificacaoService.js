// Central de notificações (RF_S8, em desenvolvimento: a API responde 501)

import { requisicao } from './api';

export const listarNotificacoes = () => requisicao('/api/notificacoes');
export const contarNaoLidas = () => requisicao('/api/notificacoes/nao-lidas');
