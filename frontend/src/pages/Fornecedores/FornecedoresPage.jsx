// RF_B1 Gerenciar fornecedores e seguradoras (Protótipo 6) - em desenvolvimento.
// Serviço: services/fornecedorService.js; API: /api/fornecedores (501).

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';
import { OPERACOES_CADASTRO } from '../../config/operacoes';

export default function FornecedoresPage() {
  return (
    <EmDesenvolvimento
      titulo="Fornecedores e seguradoras"
      funcao="RF_B1 Gerenciar fornecedores e seguradoras"
      prototipo={6}
      descricao="Cadastro único das empresas com as quais o Instituto contrata licenças e seguros, diferenciadas pelo tipo: fornecedor de software ou seguradora."
      regras={[
        'CNPJ único.',
        'Com licenças ou apólices vinculadas, o cadastro não é excluído, apenas inativado (RN22).'
      ]}
      operacoes={OPERACOES_CADASTRO}
    />
  );
}
