// Listagem das contas: solicitações pendentes primeiro, depois ativas,
// desativadas e, por último, as solicitações recusadas (preservadas, RN22).
// Uma única ação por linha, "Gerenciar" ("Revisar" no pedido pendente e
// "Consultar" no recusado), que abre o painel lateral da conta.

const ROTULO_SITUACAO = { pendente: 'aguardando aprovação', recusada: 'recusada', ativo: 'ativa', inativo: 'desativada' };

// Não há "último acesso" (RN41): só a data da solicitação e quem aprovou
function dataHora(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;
}

export default function TabelaContas({ contas, carregando, idContaAtual, aoGerenciar }) {
  if (carregando && contas.length === 0) return <p className="estado-vazio">Carregando contas...</p>;
  if (contas.length === 0) return <p className="estado-vazio">Nenhuma conta encontrada.</p>;

  return (
    <div className="tabela-area">
      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Login</th>
            <th>Perfil</th>
            <th>Colaborador e setor</th>
            <th>Situação</th>
            <th aria-label="Ações"></th>
          </tr>
        </thead>
        <tbody>
          {contas.map((c) => {
            const propria = c.id_usuario === idContaAtual;
            const pendente = c.situacao === 'pendente';
            const pedido = pendente || c.situacao === 'recusada';
            return (
              <tr key={c.id_usuario} className={c.situacao === 'inativo' || c.situacao === 'recusada' ? 'linha-inativa' : ''}>
                <td>
                  {c.nome}{propria && <span className="marca-alocado">você</span>}
                  <small className="sublinha">{c.email}</small>
                </td>
                <td className="col-etiqueta">{c.login}</td>
                <td>
                  <span className={`etiqueta-perfil perfil-${c.perfil.toLowerCase()}`}>{c.perfil}</span>
                  {c.troca_senha_obrigatoria && <span className="marca-alocado">senha provisória</span>}
                </td>
                <td>
                  {c.nome_colaborador || (pendente ? <span className="vazio">a definir na aprovação</span> : <span className="vazio">sem colaborador</span>)}
                  <small className="sublinha">
                    {c.nome_setor || (pedido && c.nome_setor_solicitado ? `${c.nome_setor_solicitado} (informado no pedido)` : '')}
                  </small>
                </td>
                <td>
                  <span className={`situacao situacao-conta-${c.situacao}`}>{ROTULO_SITUACAO[c.situacao]}</span>
                  {pendente && <span className="marca-alocado">solicitada em {dataHora(c.criada_em)}</span>}
                  {c.aprovada_em && c.nome_aprovador && <span className="marca-alocado">aprovada por {c.nome_aprovador}</span>}
                </td>
                <td className="col-acoes">
                  <button type="button" className="botao-texto" onClick={() => aoGerenciar(c)}>
                    {pendente ? 'Revisar' : c.situacao === 'recusada' ? 'Consultar' : 'Gerenciar'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
