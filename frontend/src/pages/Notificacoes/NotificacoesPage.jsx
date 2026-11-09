// Central de notificações (Protótipo 3) - em desenvolvimento.
// RF_S8, alimentada pela rotina RF_F12. Serviço: services/notificacaoService.js;
// API: /api/notificacoes (501).

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';

export default function NotificacoesPage() {
  return (
    <EmDesenvolvimento
      titulo="Notificações"
      funcao="RF_S8 Consultar a central de notificações"
      prototipo={3}
      descricao="Avisos de vencimento de licenças, apólices e projetos, emitidos pela rotina diária (RF_F12) conforme a antecedência configurada por cada conta."
      regras={['Abrir a lista marca os avisos exibidos como lidos; ler não significa resolver a pendência (RN24).']}
      operacoes={[{ nome: 'Consultar os avisos da própria conta' }]}
    />
  );
}
