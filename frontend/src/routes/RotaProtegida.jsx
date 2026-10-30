// Proteção das telas por login (RF_B9).
// Sem sessão, manda para /login guardando a tela pedida; com senha
// provisória, só libera Minha conta até a troca. A permissão de cada tela é
// conferida por ExigePermissao. A regra de verdade continua na API.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function RotaProtegida() {
  const { autenticado, carregando, trocaSenhaObrigatoria } = useAuth();
  const local = useLocation();

  if (carregando) return <p className="carregando-tela">Conferindo a sessão...</p>;
  if (!autenticado) return <Navigate to="/login" replace state={{ de: local.pathname + local.search }} />;
  if (trocaSenhaObrigatoria && local.pathname !== '/minha-conta') {
    return <Navigate to="/minha-conta" replace />;
  }
  return <Outlet />;
}
