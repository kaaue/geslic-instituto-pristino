// RF_B5 Gerenciar setores (Protótipo 9) - em desenvolvimento.
// A lista dos ativos já existe na API e alimenta a tela de equipamentos; o
// cadastro completo responde 501. Serviço: services/setorService.js.

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';
import { OPERACOES_CADASTRO } from '../../config/operacoes';

export default function SetoresPage() {
  return (
    <EmDesenvolvimento
      titulo="Setores"
      funcao="RF_B5 Gerenciar setores"
      prototipo={9}
      descricao="Lista inicialmente pré-cadastrada, com o responsável e a quantidade de colaboradores e de equipamentos de cada setor, e inclusão de novos setores."
      regras={['Setores com colaboradores, equipamentos ou bens vinculados não são excluídos, apenas inativados.']}
      operacoes={OPERACOES_CADASTRO}
    />
  );
}
