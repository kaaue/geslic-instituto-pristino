// RF_B8 Gerenciar tipos de seguro e coberturas (Protótipo 12) - em desenvolvimento.
// Serviço: services/tipoSeguroService.js; API: /api/tipos-seguro (501).

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';
import { OPERACOES_CADASTRO } from '../../config/operacoes';

export default function TiposSeguroPage() {
  return (
    <EmDesenvolvimento
      titulo="Tipos de seguro e coberturas"
      funcao="RF_B8 Gerenciar tipos de seguro e coberturas"
      prototipo={12}
      descricao="Tipos de seguro com a quantidade de coberturas e, para o tipo selecionado, as coberturas oferecidas no registro e na renovação de apólices."
      regras={['Coberturas já usadas em apólices não são excluídas, apenas inativadas para novos registros.']}
      operacoes={OPERACOES_CADASTRO}
    />
  );
}
