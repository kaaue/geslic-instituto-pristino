// Fundo escurecido atrás de um painel lateral ou janela. Clicar no fundo fecha.

export default function Sobreposicao({ aoFechar, children }) {
  return (
    <>
      <div className="fundo-painel" onClick={aoFechar} />
      {children}
    </>
  );
}
