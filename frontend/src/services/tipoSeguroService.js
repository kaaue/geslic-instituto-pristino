// RF_B8 Gerenciar tipos de seguro e coberturas (em desenvolvimento: a API responde 501)

import { requisicao, servicoDeCadastro } from './api';

export default {
  ...servicoDeCadastro('/api/tipos-seguro'),
  listarCoberturas: (id) => requisicao(`/api/tipos-seguro/${id}/coberturas`)
};
