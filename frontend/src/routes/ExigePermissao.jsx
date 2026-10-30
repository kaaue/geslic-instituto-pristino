// Bloqueia o acesso direto pela URL a uma tela que a conta não pode abrir:
// mostra Acesso negado em vez da tela. A permissão vem de config/navegacao.js.

import useAuth from '../hooks/useAuth';
import AcessoNegadoPage from '../pages/AcessoNegado/AcessoNegadoPage.jsx';
import { telaDoCaminho } from '../config/navegacao';

export default function ExigePermissao({ caminho, children }) {
  const { pode } = useAuth();
  const tela = telaDoCaminho(caminho);
  if (tela && !pode(tela.permissao)) return <AcessoNegadoPage tela={tela} />;
  return children;
}
