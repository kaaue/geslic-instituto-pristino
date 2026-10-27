// Filtros da consulta de projetos. Combináveis entre si: busca livre,
// situação, responsável, fonte financiadora e prazo do término previsto.

export default function FiltrosProjetos({ filtros, aoMudar, aoLimpar, colaboradores, fontes, total }) {
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
            placeholder="código, nome ou fonte financiadora"
            value={filtros.busca}
            onChange={(e) => mudar('busca', e.target.value)}
          />
        </label>

        <label className="campo">
          <span>Situação</span>
          <select value={filtros.situacao} onChange={(e) => mudar('situacao', e.target.value)}>
            <option value="">Todas</option>
            <option value="em_andamento">Em andamento</option>
            <option value="encerrado">Encerrado</option>
          </select>
        </label>

        <label className="campo">
          <span>Prazo do término</span>
          <select value={filtros.prazo} onChange={(e) => mudar('prazo', e.target.value)}>
            <option value="">Todos</option>
            <option value="proximo">Termina nos próximos 6 meses</option>
            <option value="vencido">Término previsto vencido</option>
            <option value="sem_termino">Sem término previsto</option>
          </select>
        </label>

        <label className="campo">
          <span>Responsável</span>
          <select value={filtros.id_responsavel} onChange={(e) => mudar('id_responsavel', e.target.value)}>
            <option value="">Todos</option>
            {colaboradores.map((c) => (
              <option key={c.id_colaborador} value={c.id_colaborador}>{c.nome}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          <span>Fonte financiadora</span>
          <select value={filtros.fonte} onChange={(e) => mudar('fonte', e.target.value)}>
            <option value="">Todas</option>
            {fontes.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>

        {temFiltro && (
          <button type="button" className="botao-texto" onClick={aoLimpar}>
            Limpar filtros
          </button>
        )}
      </div>

      <p className="resumo-filtro">
        {total === 1 ? '1 projeto encontrado' : `${total} projetos encontrados`}
        {temFiltro && ' com os filtros aplicados'}
      </p>
    </section>
  );
}
