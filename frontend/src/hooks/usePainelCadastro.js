import { useCallback, useState } from 'react';
import { mensagemDeErro } from '../services/api';

// Estado do painel lateral de um cadastro (inclusão, edição, inativação...):
// qual painel está aberto, para qual registro, erros de campo, erro geral
// (mostrado dentro do painel) e o envio. executar(acao, sucesso) roda a
// operação, mostra a mensagem de sucesso na tela e fecha o painel.
export default function usePainelCadastro(mostrarMensagem, aoConcluir) {
  const [painel, setPainel] = useState(null); // { tipo, registro }
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  const abrir = useCallback((tipo, registro = null) => {
    setErros({});
    setErroGeral('');
    setPainel({ tipo, registro });
  }, []);

  const fechar = useCallback(() => {
    setPainel(null);
    setErros({});
    setErroGeral('');
  }, []);

  const executar = useCallback(async (acao, sucesso) => {
    setSalvando(true);
    setErros({});
    setErroGeral('');
    try {
      const resposta = await acao();
      mostrarMensagem('sucesso', typeof sucesso === 'function' ? sucesso(resposta) : sucesso);
      setPainel(null);
      aoConcluir?.();
      return resposta;
    } catch (erro) {
      if (erro.corpo?.erros) setErros(erro.corpo.erros);
      else setErroGeral(mensagemDeErro(erro));
      return null;
    } finally {
      setSalvando(false);
    }
  }, [mostrarMensagem, aoConcluir]);

  return { painel, abrir, fechar, erros, erroGeral, salvando, executar };
}

// Ação direta numa linha da tabela (reativar, excluir), com confirmação
export async function acaoDeLinha({ confirmar, acao, sucesso, mostrarMensagem, aoConcluir }) {
  if (confirmar && !window.confirm(confirmar)) return;
  try {
    const resposta = await acao();
    mostrarMensagem('sucesso', typeof sucesso === 'function' ? sucesso(resposta) : sucesso);
    aoConcluir?.();
  } catch (erro) {
    mostrarMensagem('erro', mensagemDeErro(erro));
  }
}
