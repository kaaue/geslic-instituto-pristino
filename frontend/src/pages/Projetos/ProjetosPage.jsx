// Tela da função fundamental RF_F1 - Gerenciar projetos institucionais (Diogo Noboru Kamino).
// Mesma organização dos cadastros: filtros, listagem só de consulta e um
// painel lateral aberto pelo botão "Gerenciar" de cada linha, que concentra
// visualização, edição, participantes, prorrogação, encerramento, reabertura
// e o histórico do projeto. Projeto não é excluído (sai de uso pelo
// encerramento, que pode ser desfeito pela reabertura).
//
// Permissões (RN21): o Operador consulta, inclui, prorroga, encerra e reabre;
// somente o Administrador altera os dados cadastrais e os participantes. As
// ações seguem as permissões da conta (vindas da API), e a API aplica a
// mesma regra.

import { useCallback, useEffect, useState } from 'react';
import FiltrosProjetos from './FiltrosProjetos.jsx';
import TabelaProjetos from './TabelaProjetos.jsx';
import FormularioProjeto from './FormularioProjeto.jsx';
import PainelAcaoProjeto from './PainelAcaoProjeto.jsx';
import Mensagem from '../../components/common/Mensagem.jsx';
import Sobreposicao from '../../components/common/Sobreposicao.jsx';
import useAuth from '../../hooks/useAuth';
import useMensagem from '../../hooks/useMensagem';
import useBuscaComAtraso from '../../hooks/useBuscaComAtraso';
import useAbrirPorLink from '../../hooks/useAbrirPorLink';
import BotaoSolicitarAjuste from '../../components/solicitacoes/BotaoSolicitarAjuste.jsx';
import FaixaCorrecao from '../../components/solicitacoes/FaixaCorrecao.jsx';
import {
  listarProjetos, buscarProjeto, listarFontesFinanciadoras, listarAnosProjetos, incluirProjeto,
  alterarProjeto, encerrarProjeto, prorrogarProjeto, reabrirProjeto
} from '../../services/projetoService';
import { listarColaboradores } from '../../services/colaboradorService';
import { listarSetores } from '../../services/setorService';
import { listarHistorico } from '../../services/historicoService';
import { mensagemDeErro } from '../../services/api';
import { dataDaApi } from '../../utils/mascaras';

const FILTROS_VAZIOS = {
  busca: '', situacao: '', id_responsavel: '', id_setor: '', prazo: '', ano: ''
};

export default function ProjetosPage() {
  const { pode } = useAuth();
  const permissoes = {
    incluir: pode('cadastro.incluir'),
    alterar: pode('cadastro.alterar'),
    prorrogar: pode('projeto.prorrogar'),
    encerrar: pode('projeto.encerrar')
  };
  const veHistorico = pode('auditoria.consultar');

  const [projetos, setProjetos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [setores, setSetores] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [anos, setAnos] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [carregando, setCarregando] = useState(true);

  const [painelAberto, setPainelAberto] = useState(false);
  const [edicao, setEdicao] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [acao, setAcao] = useState(null); // 'encerrar' | 'prorrogar' | 'reabrir'
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [mensagem, mostrarMensagem] = useMensagem(7000);

  // Listas que dependem dos projetos cadastrados: as fontes financiadoras
  // (sugestões do cadastro) e os anos de vigência. Recarregadas a cada gravação.
  const carregarListasDosFiltros = useCallback(() => {
    listarFontesFinanciadoras().then(setFontes).catch(() => setFontes([]));
    listarAnosProjetos().then(setAnos).catch(() => setAnos([]));
  }, []);

  useEffect(() => {
    listarColaboradores().then(setColaboradores).catch(() => setColaboradores([]));
    listarSetores().then(setSetores).catch(() => setSetores([]));
    carregarListasDosFiltros();
  }, [carregarListasDosFiltros]);

  const buscar = useCallback(async () => {
    setCarregando(true);
    try {
      setProjetos(await listarProjetos(filtros));
    } catch {
      mostrarMensagem('erro', 'Não foi possível carregar os projetos. ' +
        'Verifique se a API e o banco estão no ar.');
    } finally {
      setCarregando(false);
    }
  }, [filtros, mostrarMensagem]);

  // Mesmo atraso da tela de equipamentos, para não buscar a cada tecla
  useBuscaComAtraso(buscar);

  function abrirNovo() {
    setEdicao(null);
    setHistorico(null);
    setErros({});
    setPainelAberto(true);
  }

  async function carregarProjeto(id) {
    const projeto = await buscarProjeto(id);
    setEdicao(projeto);
    if (veHistorico) {
      listarHistorico({ entidade: 'projeto', id_registro: id, por_pagina: 50 })
        .then((r) => setHistorico(r.itens))
        .catch(() => setHistorico(null));
    }
    return projeto;
  }

  // A listagem não traz os participantes; o painel abre com o projeto completo
  async function abrirGerenciar(projeto) {
    try {
      await carregarProjeto(projeto.id_projeto);
      setErros({});
      setPainelAberto(true);
    } catch (erro) {
      mostrarMensagem('erro', mensagemDeErro(erro, 'Não foi possível abrir o projeto.'));
    }
  }

  function fecharPainel() {
    setPainelAberto(false);
    setEdicao(null);
    setHistorico(null);
    setErros({});
  }

  // Aberto pelo "Abrir cadastro" de uma solicitação de ajuste (RF_B10)
  const { idSolicitacao } = useAbrirPorLink(projetos, 'id_projeto', abrirGerenciar);

  // Erro de campo (400) vai para o formulário; demais erros viram mensagem
  function tratarErro(erro, padrao) {
    if (erro.corpo?.erros) {
      setErros(erro.corpo.erros);
    } else {
      mostrarMensagem('erro', mensagemDeErro(erro, padrao));
    }
  }

  async function salvar(dados) {
    setSalvando(true);
    setErros({});
    try {
      if (edicao) {
        await alterarProjeto(edicao.id_projeto, dados);
        mostrarMensagem('sucesso', `Projeto ${dados.codigo} alterado com sucesso.`);
      } else {
        await incluirProjeto(dados);
        mostrarMensagem('sucesso', `Projeto ${dados.codigo} · ${dados.nome} cadastrado com sucesso.`);
      }
      fecharPainel();
      buscar();
      carregarListasDosFiltros();
    } catch (erro) {
      tratarErro(erro, 'Não foi possível concluir a operação.');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarAcao(valor) {
    const projeto = edicao;
    setSalvando(true);
    setErros({});
    try {
      if (acao === 'encerrar') {
        const r = await encerrarProjeto(projeto.id_projeto, valor);
        mostrarMensagem('sucesso', `Projeto encerrado com sucesso em ${dataDaApi(r.data_encerramento)}. ` +
          'Os vínculos e recursos foram preservados.');
      } else if (acao === 'reabrir') {
        const r = await reabrirProjeto(projeto.id_projeto, valor.motivo);
        mostrarMensagem(r.avisos?.length ? 'aviso' : 'sucesso',
          ['Projeto reaberto com sucesso.', ...(r.avisos || [])].join(' '));
      } else {
        const r = await prorrogarProjeto(projeto.id_projeto, valor);
        mostrarMensagem('sucesso', `Término previsto prorrogado com sucesso para ${dataDaApi(r.data_fim_prevista)}.`);
      }
      setAcao(null);
      await carregarProjeto(projeto.id_projeto);
      buscar();
      carregarListasDosFiltros();
    } catch (erro) {
      tratarErro(erro, 'Não foi possível concluir a operação.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <main className="conteudo">
        <div className="titulo-area">
          <div>
            <h2>Projetos institucionais</h2>
            <p className="subtitulo">
              Cada período de um projeto é um registro independente (ex.: CAOMA 2025–2026 e CAOMA 2026–2027).
            </p>
          </div>
          {permissoes.incluir && (
            <button type="button" className="botao-principal" onClick={abrirNovo}>
              Novo projeto
            </button>
          )}
        </div>

        {!permissoes.alterar && (
          <p className="nota nota-perfil">
            Seu perfil pode consultar, cadastrar, prorrogar, encerrar e reabrir projetos.
            Alterar dados cadastrais e participantes é exclusivo do perfil Administrador.
          </p>
        )}

        <FaixaCorrecao idSolicitacao={idSolicitacao} />
        <Mensagem mensagem={mensagem} />

        <FiltrosProjetos
          filtros={filtros}
          aoMudar={setFiltros}
          aoLimpar={() => setFiltros(FILTROS_VAZIOS)}
          colaboradores={colaboradores}
          setores={setores}
          anos={anos}
          total={projetos.length}
        />

        <TabelaProjetos projetos={projetos} carregando={carregando} aoGerenciar={abrirGerenciar} />
      </main>

      {painelAberto && (
        <Sobreposicao aoFechar={fecharPainel}>
          <FormularioProjeto
            edicao={edicao}
            somenteLeitura={Boolean(edicao) && !permissoes.alterar}
            colaboradores={colaboradores}
            setores={setores}
            fontes={fontes}
            erros={acao ? {} : erros}
            salvando={salvando}
            permissoes={permissoes}
            historico={veHistorico ? historico : null}
            aoSalvar={salvar}
            aoCancelar={fecharPainel}
            aoAcao={(tipo) => { setErros({}); setAcao(tipo); }}
            atalhoAjuste={edicao && (
              <BotaoSolicitarAjuste entidade="projeto" idRegistro={edicao.id_projeto}
                rotulo={`${edicao.codigo} · ${edicao.nome}`} texto="Solicitar ajuste deste projeto" className="botao-secundario"
                aoEmitida={(r) => { fecharPainel(); mostrarMensagem('sucesso', `${r.codigo} enviada ao Administrador.`); }} />
            )}
          />
        </Sobreposicao>
      )}

      {acao && edicao && (
        <Sobreposicao aoFechar={() => setAcao(null)} classe="fundo-janela">
          <PainelAcaoProjeto
            tipo={acao}
            projeto={edicao}
            erros={erros}
            salvando={salvando}
            aoConfirmar={confirmarAcao}
            aoCancelar={() => { setAcao(null); setErros({}); }}
          />
        </Sobreposicao>
      )}
    </>
  );
}
