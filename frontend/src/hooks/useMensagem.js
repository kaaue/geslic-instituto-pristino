import { useCallback, useEffect, useRef, useState } from 'react';

// Mensagem de retorno das telas (sucesso ou erro), que some sozinha depois
// de `duracao` milissegundos.
export default function useMensagem(duracao = 5000) {
  const [mensagem, setMensagem] = useState(null);
  const temporizador = useRef(null);

  const mostrarMensagem = useCallback((tipo, texto) => {
    clearTimeout(temporizador.current);
    setMensagem({ tipo, texto });
    temporizador.current = setTimeout(() => setMensagem(null), duracao);
  }, [duracao]);

  // Não deixa o temporizador rodando depois que a tela sai
  useEffect(() => () => clearTimeout(temporizador.current), []);

  return [mensagem, mostrarMensagem];
}
