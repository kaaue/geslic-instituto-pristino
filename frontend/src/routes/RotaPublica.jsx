// Telas de autenticação (login, solicitação de acesso, recuperação de senha):
// quem já está logado vai para a tela inicial.

import { Navigate, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

export default function RotaPublica() {
  const { autenticado, carregando } = useAuth();
  if (carregando) return <p className="carregando-tela">Conferindo a sessão...</p>;
  if (autenticado) return <Navigate to="/" replace />;
  return <Outlet />;
}
