// Fundo escurecido atrás de um painel lateral ou janela. Clicar no fundo fecha.
// Renderizado direto no <body> (portal): assim uma janela aberta de dentro de
// um painel (o atalho "Solicitar ajuste" no projeto, por exemplo) não fica
// dentro do formulário do painel nem presa ao empilhamento dele.

import { createPortal } from 'react-dom';

// classe: "fundo-janela" põe a janela acima de um painel lateral já aberto
export default function Sobreposicao({ aoFechar, children, classe = '' }) {
  return createPortal(
    <>
      <div className={`fundo-painel ${classe}`} onClick={aoFechar} />
      {children}
    </>,
    document.body
  );
}
