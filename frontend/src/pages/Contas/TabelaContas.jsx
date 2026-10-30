// Listagem das contas: solicitações pendentes primeiro, depois ativas e
// desativadas, com as ações possíveis em cada situação.

const ROTULO_SITUACAO = { pendente: 'aguardando aprovação', ativo: 'ativa', inativo: 'desativada' };

function dataHora(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null;
}

export default function TabelaContas({ contas, carregando, idContaAtual, aoAgir, aoSenhaProvisoria }) {
  if (carregando && contas.length === 0) return <p className="estado-vazio">Carregando contas...</p>;
  if (contas.length === 0) return <p className="estado-vazio">Nenhuma conta encontrada.</p>;

  return (
    <div className="tabela-area">
      <table className="tabela">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Login</th>
            <th>E-mail</th>
            <th>Perfil</th>
            <th>Colaborador</th>
            <th>Último acesso</th>
            <th>Situação</th>
            <th aria-label="Ações"></th>
          </tr>
        </thead>
        <tbody>
          {contas.map((c) => {
            const propria = c.id_usuario === idContaAtual;
            return (
              <tr key={c.id_usuario} className={c.situacao === 'inativo' ? 'linha-inativa' : ''}>
                <td>{c.nome}{propria && <span className="marca-alocado">você</span>}</td>
                <td className="col-etiqueta">{c.login}</td>
                <td className="col-email">{c.email}</td>
                <td>
                  <span className={`etiqueta-perfil perfil-${c.perfil.toLowerCase()}`}>{c.perfil}</span>
                  {c.troca_senha_obrigatoria && <span className="marca-alocado">senha provisória</span>}
                </td>
                <td>{c.nome_colaborador || <span className="vazio">—</span>}</td>
                <td className="col-data">{dataHora(c.ultimo_acesso_em) || <span className="vazio">nunca</span>}</td>
                <td>
                  <span className={`situacao situacao-conta-${c.situacao}`}>{ROTULO_SITUACAO[c.situacao]}</span>
                </td>
                <td className="col-acoes col-acoes-varias">
                  {c.situacao === 'pendente' ? (
                    <>
                      <button type="button" className="botao-texto" onClick={() => aoAgir('aprovar', c)}>Aprovar</button>
                      <button type="button" className="botao-texto botao-perigo" onClick={() => aoAgir('recusar', c)}>Recusar</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="botao-texto" onClick={() => aoAgir('editar', c)}>Editar</button>
                      <button type="button" className="botao-texto" onClick={() => aoAgir('perfil', c)}>Perfil</button>
                      {c.situacao === 'ativo' && (
                        <button type="button" className="botao-texto" onClick={() => aoSenhaProvisoria(c)}>Senha provisória</button>
                      )}
                      <button
                        type="button"
                        className={`botao-texto ${c.situacao === 'ativo' ? 'botao-perigo' : ''}`}
                        onClick={() => aoAgir('situacao', c)}
                        disabled={propria && c.situacao === 'ativo'}
                        title={propria ? 'Você não pode desativar a sua própria conta' : undefined}
                      >
                        {c.situacao === 'ativo' ? 'Desativar' : 'Reativar'}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
