// Proteção das telas por login e perfil.
//
// Sem a RF_B9 ainda não há login, então `autenticado` é sempre verdadeiro e
// esta proteção só barra pelo perfil, quando a rota pede um. Quando o login
// chegar, é aqui que entra o redirecionamento para a tela de entrada.
// A regra de verdade continua na API: esconder a tela é só conveniência.

import useAuth from '../hooks/useAuth';

export default function RotaProtegida({ perfis, children }) {
  const { autenticado, perfil } = useAuth();

  if (!autenticado) {
    return <main className="conteudo"><p className="nota">Entre com sua conta para continuar.</p></main>;
  }
  if (perfis && !perfis.includes(perfil)) {
    return <main className="conteudo"><p className="nota">Seu perfil não tem acesso a esta tela.</p></main>;
  }
  return children;
}
