// RF_B7 Gerenciar tipos de seguro e coberturas

import { requisicao, servicoDeCadastro, enviarJson } from './api';

export default {
  ...servicoDeCadastro('/api/tipos-seguro'),
  listarCoberturas: (id) => requisicao(`/api/tipos-seguro/${id}/coberturas`),
  incluirCobertura: (idTipo, descricao) => requisicao(`/api/tipos-seguro/${idTipo}/coberturas`, enviarJson('POST', { descricao })),
  alterarCobertura: (id, descricao) => requisicao(`/api/tipos-seguro/coberturas/${id}`, enviarJson('PUT', { descricao })),
  inativarCobertura: (id) => requisicao(`/api/tipos-seguro/coberturas/${id}/inativacao`, enviarJson('POST', {})),
  reativarCobertura: (id) => requisicao(`/api/tipos-seguro/coberturas/${id}/reativacao`, { method: 'POST' })
};
