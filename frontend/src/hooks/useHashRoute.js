import { useEffect, useState } from 'react';

// Rota atual lida do endereço (#projetos, #equipamentos...). Usar o hash
// mantém o link direto para cada tela sem precisar de configuração no
// servidor. `rotasValidas` são os ids aceitos; qualquer outro cai na `padrao`.
export default function useHashRoute(rotasValidas, padrao) {
  function lerHash() {
    const hash = window.location.hash.replace('#', '');
    return rotasValidas.includes(hash) ? hash : padrao;
  }

  const [rota, setRota] = useState(lerHash);

  // Acompanha os botões voltar e avançar do navegador
  useEffect(() => {
    const aoMudar = () => setRota(lerHash());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function navegar(id) {
    window.location.hash = id;
    setRota(id);
  }

  return [rota, navegar];
}
