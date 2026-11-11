// Pendências de prazo dos projetos (Revisão de UX/UI v0.1, OBS-07): projeto
// em andamento cujo término previsto já passou precisa ser prorrogado ou
// encerrado pelo Administrador.
//
// A pendência é derivada do próprio cadastro (filtro "prazo vencido" da
// listagem de projetos), e não um aviso guardado à parte. Por isso:
// - aparece enquanto o projeto não for regularizado e some sozinha depois da
//   prorrogação ou do encerramento (que ficam no histórico do projeto);
// - não pode ser dispensada nem marcada como lida;
// - não se duplica: um projeto vencido é sempre uma única pendência.
// O sistema não prorroga nem encerra nada automaticamente.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listarProjetos } from '../../services/projetoService';
import { mensagemDeErro } from '../../services/api';

const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export default function BlocoPrazosVencidos() {
  const [projetos, setProjetos] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    listarProjetos({ prazo: 'vencido' })
      .then((lista) => {
        if (!ativo) return;
        // Os mais atrasados primeiro
        setProjetos([...lista].sort((a, b) => a.dias_para_termino - b.dias_para_termino));
      })
      .catch((e) => ativo && setErro(mensagemDeErro(e, 'Não foi possível carregar os prazos dos projetos.')));
    return () => { ativo = false; };
  }, []);

  return (
    <section className="bloco">
      <header className="bloco-cabecalho">
        <h3>Prazos que exigem providência</h3>
        {projetos?.length > 0 && <span className="contador-pendencias">{projetos.length}</span>}
      </header>
      <div className="bloco-corpo">
        {erro && <p className="mensagem mensagem-erro">{erro}</p>}
        {!projetos && !erro && <p className="bloco-pendente">Carregando...</p>}

        {projetos && (
          <>
            <div className="bloco-secao"><span>Projetos com término previsto ultrapassado</span></div>
            {projetos.length === 0 && (
              <p className="bloco-pendente">Nenhum projeto em andamento com o término previsto vencido.</p>
            )}
            {projetos.map((p) => {
              const atraso = Math.abs(p.dias_para_termino);
              return (
                <article className="demanda demanda-prazo" key={p.id_projeto}>
                  <div className="demanda-topo">
                    <span className="demanda-codigo">
                      <span className="demanda-tipo">PRAZO</span>
                      {p.codigo}
                    </span>
                    <span className="etiqueta-prazo prazo-vencido">
                      vencido há {atraso} {atraso === 1 ? 'dia' : 'dias'}
                    </span>
                  </div>
                  <div className="demanda-descricao">{p.nome}</div>
                  <div className="demanda-meta">
                    Em andamento · término previsto em {dataBr(p.data_fim_prevista)} · responsável: {p.nome_responsavel}
                  </div>
                  <div className="demanda-acoes">
                    <Link className="botao-texto" to={`/projetos?abrir=${p.id_projeto}`}>Prorrogar ou encerrar</Link>
                  </div>
                </article>
              );
            })}
            <p className="nota-bloco">
              A pendência continua até o projeto ser prorrogado ou encerrado. Vencimentos de licenças e
              apólices entram aqui com a RF_F13.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
