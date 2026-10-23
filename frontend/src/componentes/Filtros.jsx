// Área de filtros da consulta de equipamentos.
// Os filtros são combináveis: setor, situação, uso geral e busca livre.

export default function Filtros({ filtros, aoMudar, setores, total, aoLimpar }) {
  function mudar(campo, valor) {
    aoMudar({ ...filtros, [campo]: valor });
  }

  const temFiltro = Object.values(filtros).some((v) => v !== '');

  return (
    <section className="filtros">
      <div className="linha-filtros">
        <label className="campo campo-busca">
          <span>Buscar</span>
          <input
            type="text"
            placeholder="etiqueta, identificação ou tipo"
            value={filtros.busca}
            onChange={(e) => mudar('busca', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Setor</span>
          <select value={filtros.id_setor} onChange={(e) => mudar('id_setor', e.target.value)}>
            <option value="">Todos</option>
            {setores.map((s) => (
              <option key={s.id_setor} value={s.id_setor}>{s.nome}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Situação</span>
          <select value={filtros.situacao} onChange={(e) => mudar('situacao', e.target.value)}>
            <option value="">Todas</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </label>

        <label className="campo">
          <span>Uso geral</span>
          <select value={filtros.uso_geral} onChange={(e) => mudar('uso_geral', e.target.value)}>
            <option value="">Todos</option>
            <option value="sim">Somente uso geral</option>
            <option value="nao">Somente nominais</option>
          </select>
        </label>

        {temFiltro && (
          <button type="button" className="botao-texto" onClick={aoLimpar}>
            Limpar filtros
          </button>
        )}
      </div>

      <p className="resumo-filtro">
        {total === 1 ? '1 equipamento encontrado' : `${total} equipamentos encontrados`}
        {temFiltro && ' com os filtros aplicados'}
      </p>
    </section>
  );
}
