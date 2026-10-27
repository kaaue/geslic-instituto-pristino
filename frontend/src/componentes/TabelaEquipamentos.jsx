// Listagem dos equipamentos.
// Mostra as duas etiquetas, o tipo, o setor, o responsável e a situação,
// além de indicar quando o equipamento tem licença alocada.

export default function TabelaEquipamentos({ equipamentos, aoEditar, aoExcluir, carregando }) {
  if (carregando) {
    return <p className="estado-vazio">Carregando equipamentos...</p>;
  }

  if (equipamentos.length === 0) {
    return (
      <p className="estado-vazio">
        Nenhum equipamento encontrado. Ajuste os filtros ou cadastre um novo.
      </p>
    );
  }

  return (
    <div className="tabela-area">
      <table className="tabela">
        <thead>
          <tr>
            <th>ID</th>
            <th>Etiqueta Instituto</th>
            <th>NetScanner</th>
            <th>Identificação</th>
            <th>Tipo</th>
            <th>Setor</th>
            <th>Responsável</th>
            <th>Situação</th>
            <th aria-label="Ações"></th>
          </tr>
        </thead>
        <tbody>
          {equipamentos.map((eq) => (
            <tr key={eq.id_equipamento} className={eq.situacao === 'inativo' ? 'linha-inativa' : ''}>
              <td className="col-id">{eq.id_equipamento}</td>
              <td className="col-etiqueta">{eq.etiqueta_instituto}</td>
              <td>{eq.etiqueta_netscanner || <span className="vazio">—</span>}</td>
              <td>{eq.identificacao}</td>
              <td>{eq.tipo}</td>
              <td>{eq.nome_setor}</td>
              <td>
                {eq.uso_geral
                  ? <span className="etiqueta-uso-geral">uso geral</span>
                  : (eq.nome_responsavel || <span className="vazio">—</span>)}
              </td>
              <td>
                <span className={`situacao situacao-${eq.situacao}`}>{eq.situacao}</span>
                {eq.instancias_alocadas > 0 && (
                  <span className="marca-alocado" title="Possui licença alocada">
                    {eq.instancias_alocadas} licença{eq.instancias_alocadas > 1 ? 's' : ''}
                  </span>
                )}
              </td>
              <td className="col-acoes">
                <button type="button" className="botao-texto" onClick={() => aoEditar(eq)}>
                  Editar
                </button>
                <button
                  type="button"
                  className="botao-texto botao-perigo"
                  onClick={() => aoExcluir(eq)}
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
