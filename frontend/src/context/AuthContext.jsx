// Estado global de autenticação.
//
// A RF_B9 (login com conta individual) ainda não chegou: por enquanto o
// "usuário" é só o perfil escolhido no seletor da barra superior. O perfil é
// enviado à API em todas as requisições (services/api.js), e a API é quem
// decide o que cada perfil pode fazer (RN21). Quando o login chegar, só muda
// a origem do perfil; as telas continuam lendo daqui com useAuth().

import { createContext, useState } from 'react';
import { definirPerfil } from '../services/api';

export const PERFIS = [
  { id: 'administrador', rotulo: 'Administrador' },
  { id: 'operador', rotulo: 'Operador' }
];

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [perfil, setPerfil] = useState('administrador');

  function trocarPerfil(novo) {
    definirPerfil(novo);
    setPerfil(novo);
  }

  const valor = {
    perfil,
    trocarPerfil,
    administrador: perfil === 'administrador',
    // Sem login ainda, há sempre um perfil escolhido
    autenticado: true
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
