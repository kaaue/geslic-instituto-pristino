import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

// Abertura de um registro pelo endereço (?abrir=ID), usada pelo "Abrir
// cadastro" das solicitações de ajuste (RF_B10). Quando a lista carrega,
// chama abrir(registro) uma única vez e tira o parâmetro do endereço.
// ?solicitacao=ID indica que a correção nasce de uma solicitação: a tela
// recebe o código para mostrar e para indicar a presença "atualizando".
export default function useAbrirPorLink(itens, chave, abrir) {
  const [parametros, setParametros] = useSearchParams();
  const feito = useRef(false);
  const idAbrir = Number(parametros.get('abrir')) || null;
  const idSolicitacao = Number(parametros.get('solicitacao')) || null;

  useEffect(() => {
    if (!idAbrir || feito.current || itens.length === 0) return;
    const registro = itens.find((item) => item[chave] === idAbrir);
    if (!registro) return;
    feito.current = true;
    abrir(registro);
    const restantes = new URLSearchParams(parametros);
    restantes.delete('abrir');
    setParametros(restantes, { replace: true });
  }, [idAbrir, itens, chave, abrir, parametros, setParametros]);

  return { idSolicitacao };
}
