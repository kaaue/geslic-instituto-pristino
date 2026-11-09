// Bloco de solicitações do painel (Protótipos 2.1 e 2.2; RF_B10, RN33).
// Pendências fixadas no topo, com paginação própria; concluídas abaixo, da
// mais recente para a mais antiga, até dez, com rolagem interna. No painel
// do Administrador entram também as contas aguardando aprovação (RF_B8),
// diferenciadas e com a ação própria. O bloco se atualiza sozinho a cada
// meio minuto, sem prolongar a sessão (RN32).

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import PainelSolicitacao from './PainelSolicitacao.jsx';
import { consultarPainel } from '../../services/solicitacaoService';
import { dataHora, diaMes, textoPresenca } from './formatos';

const ATUALIZAR_A_CADA_MS = 30000;

export default function BlocoSolicitacoes({ titulo, versao = 0, aoMensagem }) {
  const { pode } = useAuth();
  const navegar = useNavigate();
  const podeConcluir = pode('ajuste.concluir');
  const [dados, setDados] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [aberta, setAberta] = useState(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async (automatica = false) => {
    try {
      setDados(await consultarPainel(pagina, automatica));
      setErro('');
    } catch (e) {
      if (e.status !== 401) setErro('Não foi possível carregar as solicitações.');
    }
  }, [pagina]);

  useEffect(() => { carregar(); }, [carregar, versao]);
  useEffect(() => {
    const temporizador = setInterval(() => carregar(true), ATUALIZAR_A_CADA_MS);
    return () => clearInterval(temporizador);
  }, [carregar]);

  const pendentes = dados?.pendentes;
  const paginas = pendentes ? Math.max(1, Math.ceil(pendentes.total / pendentes.por_pagina)) : 1;
  const inicio = pendentes && pendentes.total ? (pendentes.pagina - 1) * pendentes.por_pagina + 1 : 0;
  const fim = pendentes ? Math.min(pendentes.total, pendentes.pagina * pendentes.por_pagina) : 0;

  function abrirCadastro(item) {
    navegar(`${item.tela}?abrir=${item.id_registro}&solicitacao=${item.id_solicitacao}`);
  }

  return (
    <section className="bloco">
      <header className="bloco-cabecalho"><h3>{titulo}</h3></header>
      <div className="bloco-corpo">
        {erro && <div className="mensagem mensagem-erro">{erro}</div>}
        {!dados && !erro && <p className="bloco-pendente">Carregando...</p>}

        {pendentes && (
          <>
            <div className="bloco-secao">
              <span>Pendentes · fixadas</span>
              {pendentes.total > 0 && (
                <span className="paginacao-curta">
                  {inicio}–{fim} de {pendentes.total}
                  {paginas > 1 && (
                    <>
                      <button type="button" aria-label="Página anterior" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>‹</button>
                      <button type="button" aria-label="Próxima página" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>›</button>
                    </>
                  )}
                </span>
              )}
            </div>
            {pendentes.total === 0 && <p className="bloco-pendente">Nenhuma solicitação pendente.</p>}

            {pendentes.itens.map((item) => (item.tipo === 'conta' ? (
              <article key={`conta-${item.id_usuario}`} className="demanda demanda-conta">
                <div className="demanda-topo">
                  <span className="demanda-codigo"><span className="demanda-tipo">CONTA</span> Acesso</span>
                  <span className="situacao situacao-aguardando">Aguardando aprovação</span>
                </div>
                <span className="demanda-descricao">{item.nome} · {item.email}</span>
                <span className="demanda-meta">Solicitação pública de acesso · {dataHora(item.criada_em)}</span>
                <div className="demanda-acoes">
                  <button type="button" className="botao-texto" onClick={() => navegar(`/contas?aprovar=${item.id_usuario}`)}>
                    Revisar e aprovar
                  </button>
                </div>
              </article>
            ) : (
              <article key={item.id_solicitacao} className="demanda">
                <div className="demanda-topo">
                  <span className="demanda-codigo">
                    {podeConcluir && <span className="demanda-tipo">AJUSTE</span>} {item.codigo}
                  </span>
                  <span className="situacao situacao-pendente">Pendente</span>
                </div>
                <span className="demanda-descricao">{item.descricao}</span>
                <span className="demanda-meta">{item.nome_solicitante} · {dataHora(item.criada_em)}</span>
                <div className="pilulas">
                  <span className="pilula">{item.rotulo_entidade} {item.rotulo_registro.split(' · ')[0]}</span>
                  {item.presencas.map((p) => <span key={p.nome} className="pilula pilula-presenca">{textoPresenca(p)}</span>)}
                </div>
                <div className="demanda-acoes">
                  {podeConcluir ? (
                    <>
                      <button type="button" className="botao-texto" onClick={() => abrirCadastro(item)}>Abrir cadastro</button>
                      <button type="button" className="botao-texto" onClick={() => setAberta(item.id_solicitacao)}>Concluir</button>
                    </>
                  ) : (
                    <button type="button" className="botao-texto" onClick={() => setAberta(item.id_solicitacao)}>Abrir</button>
                  )}
                </div>
              </article>
            )))}

            <div className="bloco-secao"><span>Concluídas recentes</span><span className="paginacao-curta">até 10</span></div>
            {dados.concluidas.length === 0 ? (
              <p className="bloco-pendente">Nenhuma solicitação concluída ainda.</p>
            ) : (
              <ul className="lista-concluidas">
                {dados.concluidas.map((c) => (
                  <li key={c.id_solicitacao}>
                    <button type="button" onClick={() => setAberta(c.id_solicitacao)}>
                      {c.codigo} · {c.rotulo_entidade} {c.rotulo_registro.split(' · ')[0]}
                    </button>
                    <span>{diaMes(c.concluida_em)}</span>
                    <span className="situacao situacao-concluida">Concluída</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {aberta && (
        <PainelSolicitacao
          id={aberta}
          aoFechar={() => { setAberta(null); carregar(); }}
          aoAtualizada={(solicitacao, texto) => { if (texto) aoMensagem?.('sucesso', texto); carregar(); }}
        />
      )}
    </section>
  );
}
