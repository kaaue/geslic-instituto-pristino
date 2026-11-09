// Relatórios (Protótipos 29 a 31) - em desenvolvimento.
// RF_S2 a RF_S6. Serviço: services/relatorioService.js; API: /api/relatorios (501).
// O histórico (RF_S7) tem tela própria, exclusiva do Administrador.

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';

export default function RelatoriosPage() {
  return (
    <EmDesenvolvimento
      titulo="Relatórios"
      funcao="RF_S2 a RF_S6"
      prototipo="29 a 31"
      descricao="Central de relatórios em abas, com filtros: licenças por situação, mapa de licenças, apólices por situação, bens e pessoas segurados e relatório financeiro por projeto."
      regras={['O relatório financeiro não calcula rateio automático por instância; a distribuição entre projetos aparece no mapa de licenças.']}
      operacoes={[
        { nome: 'Licenças por situação (RF_S2)', permissao: 'relatorio.consultar' },
        { nome: 'Mapa de licenças (RF_S3)', permissao: 'relatorio.consultar' },
        { nome: 'Apólices por situação (RF_S4)', permissao: 'relatorio.consultar' },
        { nome: 'Bens e pessoas segurados (RF_S5)', permissao: 'relatorio.consultar' },
        { nome: 'Financeiro de licenças e apólices (RF_S6)', permissao: 'relatorio.consultar' }
      ]}
    />
  );
}
