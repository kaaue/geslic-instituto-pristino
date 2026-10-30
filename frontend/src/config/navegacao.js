// Menu lateral, agrupado por módulo como nos protótipos da ERS (Apêndice 2),
// e as permissões de cada tela.
//
// `permissao` é o código (tabela permissao) exigido para abrir a tela; sem
// `permissao`, qualquer conta autenticada abre. A API exige as mesmas
// permissões nas rotas: aqui é só para o menu e o bloqueio de acesso direto.
// `pendente` marca as telas cuja função ainda está em desenvolvimento.
// `secao` é o trecho do caminho de navegação ("Instituto Prístino / Cadastros / ...").
// Para adicionar uma tela: inclua aqui e em routes/AppRoutes.jsx.

export const GRUPOS_MENU = [
  {
    titulo: null,
    itens: [{ caminho: '/', rotulo: 'Painel', titulo: 'Painel', funcao: 'RF_S1', icone: '◧' }]
  },
  {
    titulo: 'Licenças',
    modulo: 'licencas',
    itens: [
      { caminho: '/licencas', rotulo: 'Licenças', funcao: 'RF_F1 a RF_F6', permissao: 'licenca.consultar', icone: '▤', pendente: true }
    ]
  },
  {
    titulo: 'Apólices',
    modulo: 'apolices',
    itens: [
      { caminho: '/apolices', rotulo: 'Apólices', funcao: 'RF_F7 a RF_F10', permissao: 'apolice.consultar', icone: '◈', pendente: true }
    ]
  },
  {
    titulo: 'Cadastros',
    secao: 'Cadastros',
    itens: [
      { caminho: '/softwares', rotulo: 'Softwares', funcao: 'RF_B2', permissao: 'cadastro.consultar', icone: '▢', pendente: true },
      { caminho: '/fornecedores', rotulo: 'Fornecedores e seguradoras', funcao: 'RF_B1', permissao: 'cadastro.consultar', icone: '▢', pendente: true },
      { caminho: '/equipamentos', rotulo: 'Equipamentos', funcao: 'RF_B3', permissao: 'cadastro.consultar', icone: '▢' },
      { caminho: '/bens-seguraveis', rotulo: 'Bens seguráveis', funcao: 'RF_B7', permissao: 'cadastro.consultar', icone: '▢', pendente: true },
      { caminho: '/colaboradores', rotulo: 'Colaboradores', funcao: 'RF_B4', permissao: 'cadastro.consultar', icone: '▢', pendente: true },
      { caminho: '/setores', rotulo: 'Setores', funcao: 'RF_B5', permissao: 'cadastro.consultar', icone: '▢', pendente: true },
      { caminho: '/projetos', rotulo: 'Projetos', funcao: 'RF_B6', permissao: 'cadastro.consultar', icone: '▢' },
      { caminho: '/tipos-seguro', rotulo: 'Tipos e coberturas', funcao: 'RF_B8', permissao: 'cadastro.consultar', icone: '▢', pendente: true }
    ]
  },
  {
    titulo: 'Consultas',
    secao: 'Consultas',
    itens: [
      { caminho: '/relatorios', rotulo: 'Relatórios', funcao: 'RF_S2 a RF_S6', permissao: 'relatorio.consultar', icone: '▥', pendente: true },
      { caminho: '/historico', rotulo: 'Histórico', funcao: 'RF_S7', permissao: 'auditoria.consultar', icone: '◷' }
    ]
  },
  {
    titulo: 'Conta',
    secao: 'Conta',
    itens: [
      { caminho: '/minha-conta', rotulo: 'Minha conta', funcao: 'RF_B9 e RF_B10', icone: '◉' },
      { caminho: '/contas', rotulo: 'Contas e perfis', funcao: 'RF_B9', permissao: 'usuario.gerenciar', icone: '⚙' }
    ]
  }
];

// Telas fora do menu lateral (abertas pela barra superior), para qualquer conta
export const OUTRAS_TELAS = [
  { caminho: '/notificacoes', rotulo: 'Notificações', funcao: 'RF_S8', pendente: true }
];

const TODAS = [
  ...GRUPOS_MENU.flatMap((g) => g.itens.map((i) => ({ ...i, modulo: g.modulo, secao: g.secao }))),
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
