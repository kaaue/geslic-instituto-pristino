// Moldura das telas públicas de autenticação (login, solicitação de acesso,
// esqueci e redefinir senha), no padrão do Protótipo 1 da ERS: painel verde
// com a marca à esquerda e o formulário num cartão à direita.

export default function PaginaAutenticacao({ titulo, subtitulo, children, larga = false }) {
  return (
    <main className={`pagina-autenticacao ${larga ? 'pagina-autenticacao-larga' : ''}`}>
      <section className="autenticacao-marca" aria-hidden="true">
        <div className="autenticacao-logo">
          <strong>GESLIC</strong>
          <span>Instituto Prístino</span>
        </div>
        <div className="autenticacao-chamada">
          <h2>Licenças e apólices sob controle</h2>
          <p>
            Cadastro único de licenças de software, instâncias, apólices e documentos,
            com avisos de vencimento e histórico preservado.
          </p>
        </div>
      </section>

      <section className="autenticacao-formulario">
        <div className="cartao-autenticacao">
          <h1>{titulo}</h1>
          {subtitulo && <p className="subtitulo">{subtitulo}</p>}
          {children}
        </div>
      </section>
    </main>
  );
}
