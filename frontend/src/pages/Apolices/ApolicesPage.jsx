// Apólices de seguro (Protótipos 23 a 27) - em desenvolvimento.
// RF_F7 a RF_F10 e a consulta da RF_S4. Serviço: services/apoliceService.js;
// API: /api/apolices (501).

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';

export default function ApolicesPage() {
  return (
    <EmDesenvolvimento
      titulo="Apólices"
      modulo="apolices"
      funcao="RF_F7 a RF_F10 · consulta RF_S4"
      prototipo="23 a 27"
      descricao="Apólices em cards com seguradora, tipo, vigência, itens segurados e prêmio; registro com coberturas e itens, renovação seletiva, cancelamento e documentos PDF por vigência."
      regras={[
        'Número único por seguradora; situação inicial vigente.',
        'A renovação inclui apenas os itens renovados (RN14); o encerramento de projeto não cancela apólices.'
      ]}
      operacoes={[
        { nome: 'Consultar apólices', permissao: 'apolice.consultar' },
        { nome: 'Registrar apólice e vincular itens (RF_F7, RF_F8)', permissao: 'apolice.registrar' },
        { nome: 'Renovar apólice (RF_F9)', permissao: 'apolice.renovar' },
        { nome: 'Cancelar apólice (RF_F10)', permissao: 'apolice.cancelar' },
        { nome: 'Anexar e consultar PDFs (RF_F11)', permissao: 'documento.gerenciar' },
        { nome: 'Corrigir dados cadastrais', permissao: 'cadastro.alterar' }
      ]}
    />
  );
}
