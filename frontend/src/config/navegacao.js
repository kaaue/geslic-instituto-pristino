// Menu lateral e as permissões de cada tela (Revisão de UX/UI v0.1, OBS-01):
// Início (Painel), Gestão (Licenças, Apólices), Cadastros (Projetos e os
// cadastros de apoio), Consultas e Sistema (Minha conta, Usuários). A pessoa
// conectada e o comando Sair ficam só no cabeçalho, sem rodapé no menu.
//
// `permissao` é o código (tabela permissao) exigido para abrir a tela; sem
// `permissao`, qualquer conta autenticada abre. A API exige as mesmas
// permissões nas rotas: aqui é só para o menu e o bloqueio de acesso direto.
// `pendente` marca as telas cuja função ainda está em desenvolvimento (o menu
// mostra "em breve" ao lado do nome).
// `secao` é o trecho do caminho de navegação ("Instituto Prístino / Cadastros / ...").
// As solicitações de ajuste (RF_B10) não têm item de menu: ficam no painel.
// Para adicionar uma tela: inclua aqui e em routes/AppRoutes.jsx.

export const GRUPOS_MENU = [
  {
    titulo: 'Início',
    itens: [
      { caminho: '/', rotulo: 'Painel', titulo: 'Painel', funcao: 'RF_S1' }
    ]
  },
  {
    titulo: 'Gestão',
    secao: 'Gestão',
    itens: [
      { caminho: '/licencas', rotulo: 'Licenças', funcao: 'RF_F2 a RF_F7', permissao: 'licenca.consultar', pendente: true, modulo: 'licencas' },
      { caminho: '/apolices', rotulo: 'Apólices', funcao: 'RF_F8 a RF_F11', permissao: 'apolice.consultar', pendente: true, modulo: 'apolices' }
    ]
  },
  {
    // Cadastros de apoio (seção 2.3.2, Protótipo 5)
    titulo: 'Cadastros',
    secao: 'Cadastros',
    itens: [
      { caminho: '/projetos', rotulo: 'Projetos', funcao: 'RF_F1', permissao: 'cadastro.consultar' },
      { caminho: '/colaboradores', rotulo: 'Colaboradores', funcao: 'RF_B4', permissao: 'cadastro.consultar' },
      { caminho: '/setores', rotulo: 'Setores', funcao: 'RF_B5', permissao: 'cadastro.consultar' },
      { caminho: '/equipamentos', rotulo: 'Equipamentos', funcao: 'RF_B3', permissao: 'cadastro.consultar' },
      { caminho: '/bens-seguraveis', rotulo: 'Bens seguráveis', funcao: 'RF_B6', permissao: 'cadastro.consultar' },
      { caminho: '/softwares', rotulo: 'Softwares', funcao: 'RF_B2', permissao: 'cadastro.consultar' },
      { caminho: '/fornecedores', rotulo: 'Fornecedores', funcao: 'RF_B1', permissao: 'cadastro.consultar' },
      { caminho: '/seguradoras', rotulo: 'Seguradoras', funcao: 'RF_B1', permissao: 'cadastro.consultar' },
      { caminho: '/tipos-seguro', rotulo: 'Tipos e coberturas', funcao: 'RF_B7', permissao: 'cadastro.consultar' }
    ]
  },
  {
    titulo: 'Consultas',
    secao: 'Consultas',
    itens: [
      { caminho: '/relatorios', rotulo: 'Relatórios', funcao: 'RF_S2 a RF_S6', permissao: 'relatorio.consultar', pendente: true },
      { caminho: '/historico', rotulo: 'Histórico', funcao: 'RF_S7', permissao: 'auditoria.consultar' }
    ]
  },
  {
    // Minha conta: preferências individuais (inclusive notificações).
    // Usuários: administração das contas, só para quem tem a permissão.
    titulo: 'Sistema',
    secao: 'Sistema',
    itens: [
      { caminho: '/minha-conta', rotulo: 'Minha conta', titulo: 'Minha conta', funcao: 'RF_B8 e RF_B9' },
      { caminho: '/contas', rotulo: 'Usuários', titulo: 'Gerenciar usuários', funcao: 'RF_B8', permissao: 'usuario.gerenciar' }
    ]
  }
];

// Telas fora do menu lateral (abertas pela barra superior), para qualquer conta
export const OUTRAS_TELAS = [
  { caminho: '/notificacoes', rotulo: 'Notificações', funcao: 'RF_S8', pendente: true }
];

const TODAS = [
  ...GRUPOS_MENU.flatMap((g) => g.itens.map((i) => ({ ...i, modulo: i.modulo ?? g.modulo, secao: g.secao }))),
  ...OUTRAS_TELAS
];

export function telaDoCaminho(caminho) {
  return TODAS.find((t) => t.caminho === caminho) || null;
}

// Menu com só o que a conta pode abrir, sem grupos vazios
export function menuDaConta(pode) {
  return GRUPOS_MENU
    .map((g) => ({ ...g, itens: g.itens.filter((i) => pode(i.permissao)) }))
    .filter((g) => g.itens.length > 0);
}
