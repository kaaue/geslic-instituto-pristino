// Painel de acompanhamento, distinto por perfil (Protótipos 2.1 e 2.2; RN33).
//
// Implementado nesta versão: para o Administrador, as pendências de prazo
// dos projetos (Revisão de UX/UI v0.1, OBS-07: término previsto vencido e
// projeto ainda em andamento); e o bloco de solicitações (RF_B10) — para o
// Operador, as solicitações de ajuste de todos os operadores e o botão
// "Emitir solicitação de ajuste"; para o Administrador, as solicitações
// recebidas: ajustes cadastrais e contas aguardando aprovação (RF_B8).
// Os demais blocos dependem de funções ainda em desenvolvimento (indicadores
// e vencimentos de licenças e apólices, RF_S1 e RF_F13; autorizações, RF_F15; notificações, RF_S8):
// aparecem identificados, sem dados simulados.

import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useMensagem from '../../hooks/useMensagem';
import Mensagem from '../../components/common/Mensagem.jsx';
import BlocoSolicitacoes from '../../components/solicitacoes/BlocoSolicitacoes.jsx';
import ModalSolicitacaoAjuste from '../../components/solicitacoes/ModalSolicitacaoAjuste.jsx';
import BlocoPrazosVencidos from './BlocoPrazosVencidos.jsx';

function BlocoEmDesenvolvimento({ titulo, texto }) {
  return (
    <section className="bloco">
      <header className="bloco-cabecalho"><h3>{titulo}</h3></header>
      <div className="bloco-corpo">
        <p className="aviso-desenvolvimento" style={{ margin: 0 }}>
          <strong>Em desenvolvimento</strong>
          {texto}
        </p>
      </div>
    </section>
  );
}

const hojeExtenso = () => new Date().toLocaleDateString('pt-BR');

export default function InicioPage() {
  const { pode } = useAuth();
  const [mensagem, mostrarMensagem] = useMensagem(6000);
  const [emitindo, setEmitindo] = useState(false);
  const [versao, setVersao] = useState(0);
  const administrador = pode('ajuste.concluir');

  return (
    <main className="conteudo">
      <div className="titulo-area">
        <div>
          <h2>Painel de acompanhamento</h2>
          <p className="subtitulo-pagina">
            {administrador
              ? `Vigências atuais em ${hojeExtenso()}.`
              : 'Solicitações de todos os operadores são visíveis a todos os operadores; contas aguardando aprovação, somente aos Administradores.'}
          </p>
        </div>
        {pode('ajuste.solicitar') && (
          <button type="button" className="botao-principal" onClick={() => setEmitindo(true)}>
            + Emitir solicitação de ajuste
          </button>
        )}
      </div>

      <Mensagem mensagem={mensagem} />

      {administrador && (
        <p className="aviso-desenvolvimento">
          <strong>Indicadores em desenvolvimento</strong>
          Instâncias contratadas, em uso e vagas e apólices vigentes (RF_S1) dependem das funções de licenças
          e apólices, ainda não implementadas. Nenhum número é simulado.
        </p>
      )}

      <div className="painel-blocos">
        {administrador ? (
          <>
            <BlocoPrazosVencidos />
            <BlocoEmDesenvolvimento titulo="Autorizações emitidas"
              texto="A emissão de autorizações operacionais e o registro dos resultados entram com a RF_F15." />
            <BlocoSolicitacoes titulo="Solicitações recebidas" versao={versao} aoMensagem={mostrarMensagem} />
          </>
        ) : (
          <>
            <BlocoEmDesenvolvimento titulo="Últimas notificações"
              texto="A central de notificações e os avisos conforme as suas preferências entram com a RF_S8 e a RF_F13." />
            <BlocoEmDesenvolvimento titulo="Autorizações da gestão"
              texto="As autorizações emitidas pela gestão e o registro dos resultados entram com a RF_F15." />
            <BlocoSolicitacoes titulo="Solicitações de ajuste" versao={versao} aoMensagem={mostrarMensagem} />
          </>
        )}
      </div>

      {emitindo && (
        <ModalSolicitacaoAjuste
          aoFechar={() => setEmitindo(false)}
          aoEmitida={(s) => {
            setEmitindo(false);
            setVersao((v) => v + 1);
            mostrarMensagem('sucesso', `${s.codigo} enviada. Um Administrador fará a correção e concluirá a solicitação.`);
          }}
        />
      )}
    </main>
  );
}
