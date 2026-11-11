// Fundo escurecido atrás de um painel lateral ou janela. Clicar no fundo ou
// apertar Esc fecha. Renderizado direto no <body> (portal): assim uma janela
// aberta de dentro de um painel (o atalho "Solicitar ajuste" no projeto, por
// exemplo) não fica dentro do formulário do painel nem presa ao empilhamento
// dele. Com mais de uma sobreposição aberta, o Esc fecha só a de cima.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const abertas = [];

// classe: "fundo-janela" põe a janela acima de um painel lateral já aberto
export default function Sobreposicao({ aoFechar, children, classe = '' }) {
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    const marca = {};
    abertas.push(marca);
    function tecla(evento) {
      if (evento.key === 'Escape' && abertas.at(-1) === marca) fechar.current();
    }
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
      abertas.splice(abertas.indexOf(marca), 1);
    };
  }, []);

  return createPortal(
    <>
      <div className={`fundo-painel ${classe}`} onClick={aoFechar} />
      {children}
    </>,
    document.body
  );
}
