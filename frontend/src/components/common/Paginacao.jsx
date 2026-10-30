// Navegação entre páginas de uma listagem paginada pela API.

export default function Paginacao({ pagina, porPagina, total, aoMudar }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (total === 0) return null;
  const inicio = (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);
  return (
    <nav className="paginacao" aria-label="Paginação">
      <span>{inicio}–{fim} de {total}</span>
      <button type="button" className="botao-secundario" disabled={pagina <= 1} onClick={() => aoMudar(pagina - 1)}>
        Anterior
      </button>
      <span>Página {pagina} de {paginas}</span>
      <button type="button" className="botao-secundario" disabled={pagina >= paginas} onClick={() => aoMudar(pagina + 1)}>
        Próxima
      </button>
    </nav>
  );
}
