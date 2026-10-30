// RF_B4 Gerenciar colaboradores (Protótipo 8) - em desenvolvimento.
// A lista dos ativos já existe na API e alimenta as telas de equipamentos e
// projetos; o cadastro completo responde 501.
// Serviço: services/colaboradorService.js; API: /api/colaboradores.

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';
import { OPERACOES_CADASTRO } from '../../config/operacoes';

export default function ColaboradoresPage() {
  return (
    <EmDesenvolvimento
      titulo="Colaboradores"
      funcao="RF_B4 Gerenciar colaboradores"
      prototipo={8}
      descricao="Cadastro mínimo das pessoas do Instituto: nome, setor, cargo, e-mail, projetos de que participa e situação (ativo ou desligado). O cadastro não cria conta de acesso."
      regras={[
        'Nome igual a outro gera aviso de homônimo e permite continuar; e-mail repetido é bloqueado (RN19).',
        'O desligamento (operação Inativar) encerra as utilizações; as instâncias continuam ativas e passam a vagas (RN07).'
      ]}
      operacoes={OPERACOES_CADASTRO}
    />
  );
}
