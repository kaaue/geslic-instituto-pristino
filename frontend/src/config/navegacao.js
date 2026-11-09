// Menu lateral e as permissões de cada tela. Painel, Licenças e Apólices ficam
// direto no menu; os cadastros (inclusive Projetos) ficam no grupo expansível
// Cadastros; Consultas e Configurações vêm depois.
//
// `permissao` é o código (tabela permissao) exigido para abrir a tela; sem
// `permissao`, qualquer conta autenticada abre. A API exige as mesmas
// permissões nas rotas: aqui é só para o menu e o bloqueio de acesso direto.
// `pendente` marca as telas cuja função ainda está em desenvolvimento.
// `secao` é o trecho do caminho de navegação ("Instituto Prístino / Cadastros / ...").
// `expansivel` mostra o grupo como uma entrada que abre e fecha (Cadastros).
// As solicitações de ajuste (RF_B10) não têm item de menu: ficam no painel.
// Para adicionar uma tela: inclua aqui e em routes/AppRoutes.jsx.

export const GRUPOS_MENU = [
  {
    // Itens principais, sem título de grupo (sem "PROJETOS > Projetos")
    titulo: null,
    itens: [
      { caminho: '/', rotulo: 'Painel', titulo: 'Painel', funcao: 'RF_S1', icone: '◧' },
      { caminho: '/licencas', rotulo: 'Licenças', funcao: 'RF_F2 a RF_F7', permissao: 'licenca.consultar', icone: '▤', pendente: true, modulo: 'licencas' },
      { caminho: '/apolices', rotulo: 'Apólices', funcao: 'RF_F8 a RF_F11', permissao: 'apolice.consultar', icone: '◈', pendente: true, modulo: 'apolices' }
    ]
  },
  {
    // Entrada única e expansível Cadastros (seção 2.3.2, Protótipo 5)
    titulo: 'Cadastros',
    secao: 'Cadastros',
    expansivel: true,
    icone: '▦',
    itens: [
      { caminho: '/projetos', rotulo: 'Projetos', funcao: 'RF_F1', permissao: 'cadastro.consultar' },
      { caminho: '/colaboradores', rotulo: 'Colaboradores', funcao: 'RF_B4', permissao: 'cadastro.consultar' },
      { caminho: '/equipamentos', rotulo: 'Equipamentos', funcao: 'RF_B3', permissao: 'cadastro.consultar' },
      { caminho: '/softwares', rotulo: 'Softwares', funcao: 'RF_B2', permissao: 'cadastro.consultar' },
      { caminho: '/fornecedores', rotulo: 'Fornecedores', funcao: 'RF_B1', permissao: 'cadastro.consultar' },
      { caminho: '/seguradoras', rotulo: 'Seguradoras', funcao: 'RF_B1', permissao: 'cadastro.consultar' },
      { caminho: '/bens-seguraveis', rotulo: 'Bens seguráveis', funcao: 'RF_B6', permissao: 'cadastro.consultar' },
      { caminho: '/setores', rotulo: 'Setores', funcao: 'RF_B5', permissao: 'cadastro.consultar' },
      { caminho: '/tipos-seguro', rotulo: 'Tipos e coberturas', funcao: 'RF_B7', permissao: 'cadastro.consultar' }
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
    titulo: 'Configurações',
    secao: 'Configurações',
    itens: [
      { caminho: '/minha-conta', rotulo: 'Minha conta', titulo: 'Minha conta', funcao: 'RF_B8 e RF_B9', icone: '◉' },
      { caminho: '/contas', rotulo: 'Gerenciar usuários', funcao: 'RF_B8', permissao: 'usuario.gerenciar', icone: '⚙' }
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
