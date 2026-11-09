// Detalhe de uma solicitação de ajuste (Protótipos 2.8 e 2.9; RF_B10, RN36, RN42).
//
// Para o Administrador: indica a presença ("visualizando" e, ao abrir o
// cadastro ou escrever a observação, "atualizando"), mostra quem mais está
// na solicitação, as correções já registradas no cadastro afetado e permite
// concluir. A presença é informativa: não bloqueia nem cria etapa de
// assumir. Se outra pessoa concluir antes, a primeira conclusão prevalece e
// a tela explica que a tentativa não foi gravada.
// Para o Operador: acompanhamento, sem ações.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PainelLateral, { Janela } from '../common/PainelLateral.jsx';
import Campo from '../common/Campo.jsx';
import useAuth from '../../hooks/useAuth';
import { detalhar, concluir, marcarPresenca, sairDaPresenca } from '../../services/solicitacaoService';
import { mensagemDeErro } from '../../services/api';
import { dataHora, textoPresenca } from './formatos';

const INTERVALO_PRESENCA_MS = 20000;

// "setor: Campo e Monitoramento → Projetos Ambientais" a partir do antes e depois do histórico
function resumoDaCorrecao(correcao) {
  const antes = correcao.dados_anteriores || {};
  const depois = correcao.dados_posteriores || {};
  const mudancas = Object.keys(depois)
    .filter((campo) => JSON.stringify(antes[campo]) !== JSON.stringify(depois[campo]) && campo in antes)
    .map((campo) => `${campo.replace(/_/g, ' ')}: ${antes[campo] ?? '—'} → ${depois[campo] ?? '—'}`);
  return mudancas.length ? mudancas.join('; ') : correcao.descricao;
}

export default function PainelSolicitacao({ id, aoFechar, aoAtualizada }) {
  const { usuario, pode } = useAuth();
  const navegar = useNavigate();
  const podeConcluir = pode('ajuste.concluir');
  const [solicitacao, setSolicitacao] = useState(null);
  const [presencas, setPresencas] = useState([]);
  const [observacao, setObservacao] = useState('');
  const [acao, setAcao] = useState('visualizando');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [jaConcluida, setJaConcluida] = useState(null);
  const saiu = useRef(false);

  const carregar = useCallback(async () => {
    try {
      const dados = await detalhar(id);
      setSolicitacao(dados);
      setPresencas(dados.presencas || []);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível abrir a solicitação.'));
    }
  }, [id]);

  useEffect(() => { carregar(); }, [carregar]);

  const pendente = solicitacao?.situacao === 'pendente';

  // Presença informativa enquanto o detalhe está aberto (só Administrador)
  useEffect(() => {
    if (!podeConcluir || !pendente) return undefined;
    let ativo = true;
    const avisar = () => marcarPresenca(id, acao)
      .then((r) => { if (ativo) setPresencas(r.presencas); })
      .catch(() => {});
    avisar();
    const temporizador = setInterval(avisar, INTERVALO_PRESENCA_MS);
    return () => { ativo = false; clearInterval(temporizador); };
  }, [id, acao, podeConcluir, pendente]);

  const fechar = useCallback(() => {
    if (podeConcluir && !saiu.current) {
      saiu.current = true;
      sairDaPresenca(id).catch(() => {});
    }
    aoFechar();
  }, [id, podeConcluir, aoFechar]);

  // Abre o cadastro afetado já selecionado, mantendo a presença "atualizando"
  async function abrirCadastro() {
    saiu.current = true;
    await marcarPresenca(id, 'atualizando').catch(() => {});
    navegar(`${solicitacao.tela}?abrir=${solicitacao.id_registro}&solicitacao=${id}`);
  }

  async function marcarConcluida() {
    setSalvando(true);
    setErro('');
    try {
      const concluida = await concluir(id, observacao);
      saiu.current = true;
      aoAtualizada?.(concluida, `${concluida.codigo} concluída.`);
      aoFechar();
    } catch (e) {
      if (e.corpo?.codigo === 'SOLICITACAO_JA_CONCLUIDA') setJaConcluida(e.corpo);
      else setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  if (!solicitacao) {
    return (
      <PainelLateral titulo="Solicitação de ajuste" aoFechar={aoFechar}>
        {erro ? <div className="mensagem mensagem-erro">{erro}</div> : <p className="bloco-pendente">Carregando...</p>}
      </PainelLateral>
    );
  }

  const outros = presencas.filter((p) => !p.propria);
  const rodape = (
    <>
      <button type="button" className="botao-secundario" onClick={fechar}>Fechar</button>
      {podeConcluir && pendente && (
        <button type="button" className="botao-principal" onClick={marcarConcluida} disabled={salvando}>
          {salvando ? 'Concluindo...' : 'Marcar como concluída'}
        </button>
      )}
    </>
  );

  return (
    <>
      <PainelLateral
        titulo={`${solicitacao.codigo} · ${pendente ? 'Pendente' : 'Concluída'}`}
        subtitulo={`${solicitacao.rotulo_entidade} ${solicitacao.rotulo_registro} · solicitada por ${solicitacao.nome_solicitante} em ${dataHora(solicitacao.criada_em)}`}
        aoFechar={fechar}
        rodape={rodape}
        largo
      >
        {erro && <div className="mensagem mensagem-erro">{erro}</div>}

        {pendente && presencas.length > 0 && (
          <div className="pilulas">
            {presencas.map((p) => <span key={p.nome} className="pilula pilula-presenca">{textoPresenca(p)}</span>)}
          </div>
        )}
        {podeConcluir && pendente && (
          <p className="aviso-info">
            {outros.length
              ? 'Indicação informativa: você pode corrigir e concluir normalmente. Não há bloqueio nem etapa de assumir.'
              : 'Os demais Administradores veem que você está nesta solicitação. A indicação não bloqueia ninguém.'}
          </p>
        )}

        <dl className="lista-pares">
          <dt>Cadastro afetado</dt>
          <dd>{solicitacao.rotulo_entidade} · ID {solicitacao.id_registro} · {solicitacao.rotulo_registro}</dd>
          <dt>Descrição</dt>
          <dd style={{ whiteSpace: 'pre-wrap' }}>{solicitacao.descricao}</dd>
          <dt>Situação</dt>
          <dd>{pendente ? 'Pendente' : 'Concluída'}</dd>
          {!pendente && (
            <>
              <dt>Concluinte</dt><dd>{solicitacao.nome_concluinte}</dd>
              <dt>Concluída em</dt><dd>{dataHora(solicitacao.concluida_em)}</dd>
              {solicitacao.observacao_conclusao && (<><dt>Observação</dt><dd>{solicitacao.observacao_conclusao}</dd></>)}
            </>
          )}
        </dl>

        {podeConcluir && solicitacao.tela && (
          <button type="button" className="botao-secundario" style={{ alignSelf: 'flex-start' }} onClick={abrirCadastro}>
            Abrir cadastro {solicitacao.rotulo_registro.split(' · ')[0]} →
          </button>
        )}

        {podeConcluir && (solicitacao.correcoes || []).map((c) => (
          <p key={`${c.registrado_em}-${c.descricao}`} className="aviso-sucesso">
            <strong>Correção registrada</strong> em {dataHora(c.registrado_em)} por {c.nome_responsavel}: {resumoDaCorrecao(c)}
          </p>
        ))}
        {podeConcluir && pendente && (solicitacao.correcoes || []).length === 0 && (
          <p className="nota">Nenhuma correção registrada neste cadastro desde a solicitação. A conclusão não substitui a correção (RN36).</p>
        )}

        {podeConcluir && pendente && (
          <>
            <Campo rotulo="Observação da conclusão (opcional)">
              <input
                type="text"
                value={observacao}
                maxLength={500}
                onChange={(e) => { setObservacao(e.target.value); setAcao('atualizando'); }}
                placeholder="O que foi corrigido."
              />
            </Campo>
            <dl className="lista-pares">
              <dt>Concluinte</dt><dd>{usuario.nome} (sistema)</dd>
              <dt>Data e hora</dt><dd>geradas ao concluir</dd>
            </dl>
          </>
        )}
      </PainelLateral>

      {jaConcluida && (
        <Janela
          titulo="Solicitação já concluída"
          subtitulo={`${jaConcluida.conclusao.codigo} · ${jaConcluida.conclusao.rotulo_entidade} ${jaConcluida.conclusao.rotulo_registro}`}
          aoFechar={() => { setJaConcluida(null); aoAtualizada?.(null); aoFechar(); }}
          rodape={(
            <button type="button" className="botao-principal" onClick={() => { setJaConcluida(null); aoAtualizada?.(null); aoFechar(); }}>
              Entendi
            </button>
          )}
        >
          <p className="aviso">
            <strong>
              {jaConcluida.conclusao.nome_concluinte} concluiu esta solicitação em {dataHora(jaConcluida.conclusao.concluida_em)}.
            </strong>
            Sua confirmação não foi gravada e não altera a autoria nem a data da conclusão.
          </p>
          <dl className="lista-pares">
            <dt>Concluída por</dt><dd>{jaConcluida.conclusao.nome_concluinte}</dd>
            <dt>Concluída em</dt><dd>{dataHora(jaConcluida.conclusao.concluida_em)}</dd>
            <dt>Sua tentativa</dt><dd>{dataHora(jaConcluida.tentativa_em)} · não gravada</dd>
          </dl>
          <p className="aviso-info">As correções que você salvou no cadastro permanecem registradas na auditoria como correções suas.</p>
        </Janela>
      )}
    </>
  );
}
