// Listagem dos projetos.
// O término previsto mostra o aviso de prazo (RN24: antecedência padrão de
// seis meses) e os recursos vinculados ajudam a entender por que um projeto
// não pode ser excluído (RN22).

import { dataDaApi } from '../../utils/mascaras';

const MESES_AVISO_EM_DIAS = 183;

function avisoPrazo(projeto) {
  if (projeto.situacao !== 'em_andamento' || projeto.dias_para_termino === null) return null;
  const dias = projeto.dias_para_termino;
  if (dias < 0) return { classe: 'prazo-vencido', texto: `vencido há ${-dias} dia${dias === -1 ? '' : 's'}` };
  if (dias === 0) return { classe: 'prazo-proximo', texto: 'termina hoje' };
  if (dias <= MESES_AVISO_EM_DIAS) return { classe: 'prazo-proximo', texto: `termina em ${dias} dia${dias === 1 ? '' : 's'}` };
  return null;
}

function textoRecursos(p) {
  const partes = [];
  if (p.licencas_adquiridas) partes.push(`${p.licencas_adquiridas} licença${p.licencas_adquiridas > 1 ? 's' : ''}`);
  if (p.instancias_responsavel) partes.push(`${p.instancias_responsavel} instância${p.instancias_responsavel > 1 ? 's' : ''}`);
  if (p.participantes) partes.push(`${p.participantes} participante${p.participantes > 1 ? 's' : ''}`);
  return partes.join(' · ');
}

export default function TabelaProjetos({
  projetos, administrador, carregando, aoEditar, aoExcluir, aoEncerrar, aoProrrogar
}) {
  if (carregando) {
    return <p className="estado-vazio">Carregando projetos...</p>;
  }

  if (projetos.length === 0) {
    return (
      <p className="estado-vazio">
        Nenhum projeto encontrado. Ajuste os filtros ou cadastre um novo.
      </p>
    );
  }

  const somenteAdmin = 'Exclusivo do perfil Administrador';

  return (
    <div className="tabela-area">
      <table className="tabela">
        <thead>
          <tr>
            <th>Código</th>
            <th>Nome</th>
            <th>Fonte financiadora</th>
            <th>Responsável</th>
            <th>Início</th>
            <th>Término previsto</th>
            <th>Situação</th>
            <th>Recursos vinculados</th>
            <th aria-label="Ações"></th>
          </tr>
        </thead>
        <tbody>
          {projetos.map((p) => {
            const aviso = avisoPrazo(p);
            const andamento = p.situacao === 'em_andamento';
            const recursos = textoRecursos(p);
            return (
              <tr key={p.id_projeto} className={andamento ? '' : 'linha-inativa'}>
                <td className="col-etiqueta">{p.codigo}</td>
                <td>{p.nome}</td>
                <td>{p.fonte_financiadora}</td>
                <td>{p.nome_responsavel || <span className="vazio">—</span>}</td>
                <td className="col-data">{dataDaApi(p.data_inicio)}</td>
                <td className="col-data">
                  {p.data_fim_prevista ? dataDaApi(p.data_fim_prevista) : <span className="vazio">sem término</span>}
                  {aviso && <span className={`marca-prazo ${aviso.classe}`}>{aviso.texto}</span>}
                </td>
                <td>
                  <span className={`situacao ${andamento ? 'situacao-ativo' : 'situacao-inativo'}`}>
                    {andamento ? 'em andamento' : 'encerrado'}
                  </span>
                  {!andamento && (
                    <span className="marca-alocado">em {dataDaApi(p.data_encerramento)}</span>
                  )}
                </td>
                <td className="col-recursos">{recursos || <span className="vazio">nenhum</span>}</td>
                <td className="col-acoes">
                  <button type="button" className="botao-texto" onClick={() => aoEditar(p)}>
                    {administrador ? 'Editar' : 'Ver'}
                  </button>
                  {andamento && (
                    <>
                      <button type="button" className="botao-texto" onClick={() => aoProrrogar(p)}>
                        Prorrogar
                      </button>
                      <button type="button" className="botao-texto" onClick={() => aoEncerrar(p)}>
                        Encerrar
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="botao-texto botao-perigo"
                    onClick={() => aoExcluir(p)}
                    disabled={!administrador}
                    title={administrador ? 'Excluir projeto' : somenteAdmin}
                  >
                    Excluir
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
