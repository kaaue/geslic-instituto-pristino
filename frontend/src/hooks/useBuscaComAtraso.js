import { useEffect } from 'react';

// Refaz a busca sempre que `buscar` muda (ou seja, quando os filtros mudam),
// com um pequeno atraso para não disparar uma requisição por tecla digitada.
export default function useBuscaComAtraso(buscar, atraso = 250) {
  useEffect(() => {
    const tempo = setTimeout(buscar, atraso);
    return () => clearTimeout(tempo);
  }, [buscar, atraso]);
}
