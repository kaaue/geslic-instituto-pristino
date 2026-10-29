// Estrutura comum de todas as telas: barra superior, menu e o conteúdo da tela.

import BarraSuperior from './BarraSuperior.jsx';
import Menu from './Menu.jsx';
import { MENU } from '../../config/navegacao';

export default function Layout({ telaAtual, aoNavegar, children }) {
  const itemAtual = MENU.find((item) => item.id === telaAtual);

  return (
    <div className="aplicacao">
      <BarraSuperior itemAtual={itemAtual} />
      <Menu atual={telaAtual} aoNavegar={aoNavegar} />
      {children}
    </div>
  );
}
