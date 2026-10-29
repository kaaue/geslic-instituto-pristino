// Itens do menu: uma entrada por função básica já implementada.
// A ordem aqui é a ordem das abas; o primeiro item é a tela inicial.
// Qual componente abre em cada item fica em routes/AppRoutes.jsx.

export const MENU = [
  { id: 'equipamentos', rotulo: 'Equipamentos', funcao: 'RF_B3' },
  { id: 'projetos', rotulo: 'Projetos', funcao: 'RF_B6' }
];

export const TELA_INICIAL = MENU[0].id;
