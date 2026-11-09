// Painel lateral à direita, aberto somente por Novo, Editar ou uma ação
// (padrão dos cadastros, seção 2.3.2 e Apêndice 2). Escurece a tela atrás;
// clicar no fundo ou apertar Esc fecha. Com aoEnviar, o conteúdo é um
// formulário e o botão do tipo submit do rodapé o envia.

import { useEffect, useId } from 'react';
import Sobreposicao from './Sobreposicao.jsx';

export default function PainelLateral({
  titulo, subtitulo, aoFechar, aoEnviar, rodape, children, largo = false, janela = false
}) {
  const idTitulo = useId();

  useEffect(() => {
    function tecla(evento) {
      if (evento.key === 'Escape') aoFechar();
    }
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [aoFechar]);

  const Raiz = aoEnviar ? 'form' : 'div';
  const classe = janela ? `janela ${largo ? 'janela-larga' : ''}` : `painel ${largo ? 'painel-largo' : ''}`;

  return (
    <Sobreposicao aoFechar={aoFechar} classe={janela ? 'fundo-janela' : ''}>
      <Raiz
        className={classe}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        noValidate={aoEnviar ? true : undefined}
        // stopPropagation: o envio de uma janela aberta de dentro de outro
        // formulário não pode chegar ao formulário de fora
        onSubmit={aoEnviar ? (evento) => { evento.preventDefault(); evento.stopPropagation(); aoEnviar(); } : undefined}
      >
        <header className="painel-cabecalho">
          <h2 id={idTitulo}>{titulo}</h2>
          {subtitulo && <span className="id-interno">{subtitulo}</span>}
        </header>
        <div className="painel-corpo">{children}</div>
        {rodape && <footer className="painel-rodape">{rodape}</footer>}
      </Raiz>
    </Sobreposicao>
  );
}

// Janela centralizada (Protótipos 2.7, 2.9 e 13.1): o mesmo componente, no meio da tela
export function Janela(props) {
  return <PainelLateral {...props} janela />;
}
