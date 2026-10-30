// Licenças de software (Protótipos 14 a 22) - em desenvolvimento.
// RF_F1 a RF_F6 e a consulta da RF_S2. Serviço: services/licencaService.js;
// API: /api/licencas (501).

import EmDesenvolvimento from '../../components/common/EmDesenvolvimento.jsx';

export default function LicencasPage() {
  return (
    <EmDesenvolvimento
      titulo="Licenças"
      modulo="licencas"
      funcao="RF_F1 a RF_F6 · consulta RF_S2"
      prototipo="14 a 22"
      descricao="Licenças em cards com contratadas, em uso e vagas; card expandido com as instâncias; registro, alocação e utilização, transferência, liberação, renovação e inativação."
      regras={[
        'A capacidade da vigência não pode ser excedida (RN02); a instância está em uso com utilização vigente por colaborador ativo ou alocação em equipamento ativo de uso geral (RN05).',
        'A chave de ativação é cifrada e só revelada a perfis com permissão de ver dados sensíveis (seção 2.3.2).'
      ]}
      operacoes={[
        { nome: 'Consultar licenças e instâncias', permissao: 'licenca.consultar' },
        { nome: 'Registrar licença (RF_F1)', permissao: 'licenca.registrar' },
        { nome: 'Alocar, transferir e liberar instâncias (RF_F2 a RF_F4)', permissao: 'licenca.movimentar' },
        { nome: 'Renovar licença (RF_F5)', permissao: 'licenca.renovar' },
        { nome: 'Inativar licença ou instância (RF_F6)', permissao: 'licenca.inativar' },
        { nome: 'Confirmar exceção autorizada (RN10)', permissao: 'excecao.confirmar' },
        { nome: 'Anexar e consultar PDFs (RF_F11)', permissao: 'documento.gerenciar' },
        { nome: 'Corrigir dados cadastrais', permissao: 'cadastro.alterar' }
      ]}
    />
  );
}
