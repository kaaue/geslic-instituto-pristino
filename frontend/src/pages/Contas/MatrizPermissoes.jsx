// Matriz de permissões por perfil (Protótipo 13). O Administrador tem sempre
// todas (RN21); as permissões do Operador podem ser ajustadas, menos as
// exclusivas do Administrador (alterar e excluir cadastros, contas e histórico).

import { useEffect, useMemo, useState } from 'react';

export default function MatrizPermissoes({ dados, aoSalvar }) {
  const { perfis, permissoes } = dados;
  const operador = perfis.find((p) => p.nome === 'Operador');
  const [marcadas, setMarcadas] = useState(new Set());
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setMarcadas(new Set(operador?.permissoes || []));
  }, [operador]);

  const grupos = useMemo(() => {
    const porGrupo = new Map();
    for (const p of permissoes) {
      if (!porGrupo.has(p.grupo)) porGrupo.set(p.grupo, []);
      porGrupo.get(p.grupo).push(p);
    }
    return [...porGrupo.entries()];
  }, [permissoes]);

  const alterado = operador && (
    marcadas.size !== operador.permissoes.length || operador.permissoes.some((c) => !marcadas.has(c))
  );

  function alternar(codigo) {
    const nova = new Set(marcadas);
    if (nova.has(codigo)) nova.delete(codigo);
    else nova.add(codigo);
    setMarcadas(nova);
  }

  async function salvar() {
    setSalvando(true);
    await aoSalvar(operador.id_perfil, [...marcadas]);
    setSalvando(false);
  }

  if (!operador) return <p className="estado-vazio">Carregando perfis...</p>;

  return (
    <section className="cartao">
      <p className="nota">
        O Administrador realiza tudo o que o Operador realiza e, exclusivamente, altera e exclui dados
        cadastrais, gerencia as contas e permissões e consulta o histórico (RN21). As permissões do
        Operador podem ser ajustadas abaixo e valem na próxima ação de cada conta.
      </p>
      <table className="tabela matriz">
        <thead>
          <tr><th>Permissão</th><th>Administrador</th><th>Operador</th></tr>
        </thead>
        <tbody>
          {grupos.map(([grupo, lista]) => (
            <FragmentoGrupo key={grupo} grupo={grupo} lista={lista} marcadas={marcadas} alternar={alternar} />
          ))}
        </tbody>
      </table>
      <div className="acoes-cartao">
        <button type="button" className="botao-secundario" disabled={!alterado || salvando}
          onClick={() => setMarcadas(new Set(operador.permissoes))}>Desfazer</button>
        <button type="button" className="botao-principal" disabled={!alterado || salvando} onClick={salvar}>
          {salvando ? 'Salvando...' : 'Salvar permissões do Operador'}
        </button>
      </div>
    </section>
  );
}

function FragmentoGrupo({ grupo, lista, marcadas, alternar }) {
  return (
    <>
      <tr className="linha-grupo"><td colSpan={3}>{grupo}</td></tr>
      {lista.map((p) => (
        <tr key={p.codigo}>
          <td>
            {p.descricao}
            <span className="marca-alocado"><code>{p.codigo}</code>{p.exclusiva_administrador ? ' · exclusiva do Administrador' : ''}</span>
          </td>
          <td className="col-check"><span aria-label="permitida">✓</span></td>
          <td className="col-check">
            <input
              type="checkbox"
              checked={marcadas.has(p.codigo)}
              disabled={p.exclusiva_administrador}
              onChange={() => alternar(p.codigo)}
              aria-label={`Operador: ${p.descricao}`}
            />
          </td>
        </tr>
      ))}
    </>
  );
}
