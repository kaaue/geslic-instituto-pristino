// RF_B2 Gerenciar softwares (Protótipo 5) - em desenvolvimento.
// Serviço: services/softwareService.js; API: /api/softwares (501).

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';
import { OPERACOES_CADASTRO } from '../../config/operacoes';

export default function SoftwaresPage() {
  return (
    <EmDesenvolvimento
      titulo="Softwares"
      funcao="RF_B2 Gerenciar softwares"
      prototipo={5}
      descricao="Cadastro dos softwares usados pelo Instituto: nome, versão, fabricante, categoria de uso e situação. O software descreve o produto; a licença registra a aquisição do direito de uso."
      regras={[
        'A listagem informa quantas licenças estão vinculadas a cada software.',
        'Software com licença não é excluído, apenas inativado (RN22).'
      ]}
      operacoes={OPERACOES_CADASTRO}
    />
  );
}
