// RF_B7 Gerenciar bens seguráveis (Protótipo 11) - em desenvolvimento.
// Serviço: services/bemSeguravelService.js; API: /api/bens-seguraveis (501).

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';
import { OPERACOES_CADASTRO } from '../../config/operacoes';

export default function BensSeguraveisPage() {
  return (
    <EmDesenvolvimento
      titulo="Bens seguráveis"
      funcao="RF_B7 Gerenciar bens seguráveis"
      prototipo={11}
      descricao="Cadastro de veículos, imóveis, drones e outros bens que podem ser cobertos por apólices. A listagem indica a apólice que cobre cada bem."
      regras={[
        'A identificação depende da categoria (placa, endereço ou número de série) e não exige etiqueta do Instituto (RN20).',
        'O equipamento já cadastrado é um bem e pode ser segurado sem novo cadastro.'
      ]}
      operacoes={OPERACOES_CADASTRO}
    />
  );
}
