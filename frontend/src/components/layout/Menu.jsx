// Abas de navegação entre as funções básicas (itens em config/navegacao.js).

import { MENU } from '../../config/navegacao';

export default function Menu({ atual, aoNavegar }) {
  return (
    <nav className="abas" aria-label="Funções básicas">
      {MENU.map((item) => (
        <button
          key={item.id}
          type="button"
          className={item.id === atual ? 'aba aba-ativa' : 'aba'}
          onClick={() => aoNavegar(item.id)}
        >
          {item.rotulo} <small>{item.funcao}</small>
        </button>
      ))}
    </nav>
  );
}
