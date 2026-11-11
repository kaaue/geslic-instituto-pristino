// RF_B2 Gerenciar softwares

import { requisicao, servicoDeCadastro } from './api';

export default {
  ...servicoDeCadastro('/api/softwares'),
  // Categorias já usadas, sugeridas no formulário
  categorias: () => requisicao('/api/softwares/categorias')
};
