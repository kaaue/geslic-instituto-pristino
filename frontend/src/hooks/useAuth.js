import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';

// Perfil atual e ação de trocar o perfil (ver AuthContext)
export default function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return contexto;
}
