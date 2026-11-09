// Tela da função básica RF_B6 - Gerenciar projetos institucionais (Diogo Noboru Kamino).
// Mesma organização da tela de equipamentos: filtros, listagem e painel lateral
// de inclusão e edição, mais duas ações próprias do projeto: prorrogar o término
// previsto e encerrar (RN17).
//
// Perfis (RN21): o Operador consulta, inclui, prorroga e encerra; somente o
// Administrador altera os dados cadastrais e exclui. A API aplica a mesma regra.

import { useCallback, useEffect, useState } from 'react';
import FiltrosProjetos from '../componentes/projetos/FiltrosProjetos.jsx';
import TabelaProjetos from '../componentes/projetos/TabelaProjetos.jsx';
import FormularioProjeto from '../componentes/projetos/FormularioProjeto.jsx';
import PainelAcaoProjeto from '../componentes/projetos/PainelAcaoProjeto.jsx';
import {
  listarProjetos, buscarProjeto, listarFontesFinanciadoras, listarAnosProjetos, incluirProjeto,
  alterarProjeto, excluirProjeto, encerrarProjeto, prorrogarProjeto, listarColaboradores
} from '../api';
import { dataDaApi } from '../mascaras';

const FILTROS_VAZIOS = {
  busca: '', situacao: '', id_responsavel: '', fonte: '', prazo: '', ano: '', semestre: ''
};

export default function TelaProjetos({ perfil }) {
  const administrador = perfil === 'administrador';

  const [projetos, setProjetos] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [fontes, setFontes] = useState([]);
  const [anos, setAnos] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [carregando, setCarregando] = useState(true);

  const [painelAberto, setPainelAberto] = useState(false);
  const [edicao, setEdicao] = useState(null);
  const [acao, setAcao] = useState(null); // { tipo: 'encerrar' | 'prorrogar', projeto }
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);

  // Listas dos filtros que dependem dos projetos cadastrados: as fontes
  // financiadoras e os anos de vigência. Recarregadas sempre que um projeto
  // é incluído, alterado, prorrogado, encerrado ou excluído.
  const carregarListasDosFiltros = useCallback(() => {
    listarFontesFinanciadoras().then(setFontes).catch(() => setFontes([]));
    listarAnosProjetos().then(setAnos).catch(() => setAnos([]));
  }, []);

  useEffect(() => {
    listarColaboradores().then(setColaboradores).catch(() => setColaboradores([]));
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
  }, [filtros]);

  // Mesmo atraso da tela de equipamentos, para não buscar a cada tecla
  useEffect(() => {
    const tempo = setTimeout(buscar, 250);
    return () => clearTimeout(tempo);
  }, [buscar]);

  function mostrarMensagem(tipo, texto) {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 6000);
  }

  function abrirNovo() {
    setEdicao(null);
    setErros({});
    setPainelAberto(true);
  }

  // A listagem não traz os participantes; o painel abre com o projeto completo
  async function abrirEdicao(projeto) {
    try {
      setEdicao(await buscarProjeto(projeto.id_projeto));
      setErros({});
      setPainelAberto(true);
    } catch (erro) {
      mostrarMensagem('erro', erro.corpo?.mensagem || 'Não foi possível abrir o projeto.');
    }
  }

  function fecharPainel() {
    setPainelAberto(false);
    setEdicao(null);
    setErros({});
  }

  function abrirAcao(tipo, projeto) {
    setErros({});
    setAcao({ tipo, projeto });
  }

  function fecharAcao() {
    setAcao(null);
    setErros({});
  }

  // Erro de campo (400) vai para o formulário; demais erros viram mensagem
  function tratarErro(erro, padrao) {
    if (erro.corpo?.erros) {
      setErros(erro.corpo.erros);
    } else {
      mostrarMensagem('erro', erro.corpo?.mensagem || padrao);
    }
  }

  async function salvar(dados) {
    setSalvando(true);
    setErros({});
    try {
      if (edicao) {
        await alterarProjeto(edicao.id_projeto, dados);
        mostrarMensagem('sucesso', `Projeto ${dados.codigo} alterado.`);
      } else {
        await incluirProjeto(dados);
        mostrarMensagem('sucesso', `Projeto ${dados.codigo} · ${dados.nome} cadastrado.`);
      }
      fecharPainel();
      buscar();
      carregarListasDosFiltros();
    } catch (erro) {
      tratarErro(erro, 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarAcao(data) {
    const { tipo, projeto } = acao;
    setSalvando(true);
    setErros({});
    try {
      if (tipo === 'encerrar') {
        const r = await encerrarProjeto(projeto.id_projeto, data);
        const recursos = r.licencas_vinculadas + r.instancias_vinculadas;
        mostrarMensagem('sucesso', `Projeto ${projeto.codigo} encerrado em ${dataDaApi(r.data_encerramento)}.` +
          (recursos > 0 ? ' Os recursos vinculados foram mantidos, sem transferência ou cancelamento.' : ''));
      } else {
        const r = await prorrogarProjeto(projeto.id_projeto, data);
        mostrarMensagem('sucesso', `Término previsto do projeto ${projeto.codigo} prorrogado para ${dataDaApi(r.data_fim_prevista)}.`);
      }
      fecharAcao();
      buscar();
      // prorrogar ou encerrar muda o último ano de vigência do projeto
      carregarListasDosFiltros();
    } catch (erro) {
      tratarErro(erro, 'Não foi possível concluir a ação.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(projeto) {
    const confirmado = window.confirm(`Excluir o projeto ${projeto.codigo} — ${projeto.nome}?`);
    if (!confirmado) return;
    try {
      await excluirProjeto(projeto.id_projeto);
      mostrarMensagem('sucesso', `Projeto ${projeto.codigo} excluído.`);
      buscar();
      carregarListasDosFiltros();
    } catch (erro) {
      // 409: projeto com vínculos (RN22); 403: perfil sem permissão (RN21)
      mostrarMensagem('erro', erro.corpo?.mensagem || 'Não foi possível excluir.');
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
          <button type="button" className="botao-principal" onClick={abrirNovo}>
            Novo projeto
          </button>
        </div>

        {!administrador && (
          <p className="nota nota-perfil">
            Perfil Operador: você pode consultar, cadastrar, prorrogar e encerrar projetos.
            Alterar e excluir dados cadastrais é exclusivo do perfil Administrador.
          </p>
        )}

        {mensagem && (
          <div className={`mensagem mensagem-${mensagem.tipo}`}>{mensagem.texto}</div>
        )}

        <FiltrosProjetos
          filtros={filtros}
          aoMudar={setFiltros}
          aoLimpar={() => setFiltros(FILTROS_VAZIOS)}
          colaboradores={colaboradores}
          fontes={fontes}
          anos={anos}
          total={projetos.length}
        />

        <TabelaProjetos
          projetos={projetos}
          administrador={administrador}
          carregando={carregando}
          aoEditar={abrirEdicao}
          aoExcluir={excluir}
          aoEncerrar={(p) => abrirAcao('encerrar', p)}
          aoProrrogar={(p) => abrirAcao('prorrogar', p)}
        />
      </main>

      {painelAberto && (
        <>
          <div className="fundo-painel" onClick={fecharPainel} />
          <FormularioProjeto
            edicao={edicao}
            somenteLeitura={Boolean(edicao) && !administrador}
            colaboradores={colaboradores}
            fontes={fontes}
            erros={erros}
            salvando={salvando}
            aoSalvar={salvar}
            aoCancelar={fecharPainel}
          />
        </>
      )}

      {acao && (
        <>
          <div className="fundo-painel" onClick={fecharAcao} />
          <PainelAcaoProjeto
            tipo={acao.tipo}
            projeto={acao.projeto}
            erros={erros}
            salvando={salvando}
            aoConfirmar={confirmarAcao}
            aoCancelar={fecharAcao}
          />
        </>
      )}
    </>
  );
}
