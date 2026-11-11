import { useCallback, useRef, useState } from 'react';
import useBuscaComAtraso from './useBuscaComAtraso';
import { mensagemDeErro } from '../services/api';

// Listagem de um cadastro com filtros: refaz a busca a cada mudança de
// filtro (com um pequeno atraso) e devolve o que a tela precisa.
// aoFalhar(texto) mostra a mensagem de erro da tela.
export default function useListagem(listar, filtrosIniciais, aoFalhar) {
  const [itens, setItens] = useState([]);
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [carregando, setCarregando] = useState(true);
  // As telas passam aoFalhar como função nova a cada desenho; guardada aqui,
  // ela não entra nas dependências da busca (senão a lista seria buscada de
  // novo sem parar, a cada resposta).
  const aoFalharAtual = useRef(aoFalhar);
  aoFalharAtual.current = aoFalhar;

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setItens(await listar(filtros));
    } catch (erro) {
      if (erro.status !== 401) aoFalharAtual.current(mensagemDeErro(erro, 'Não foi possível carregar a lista. Verifique se a API está no ar.'));
    } finally {
      setCarregando(false);
    }
  }, [listar, filtros]);

  useBuscaComAtraso(recarregar);

  return { itens, filtros, setFiltros, carregando, recarregar, limpar: () => setFiltros(filtrosIniciais) };
}
