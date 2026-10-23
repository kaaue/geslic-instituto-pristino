// Tela da função básica RF_B3 - Gerenciar equipamentos.
// Organização: barra superior, filtros, listagem e painel lateral de
// inclusão e edição, seguindo o protótipo aprovado na ERS.

import { useCallback, useEffect, useState } from 'react';
import Filtros from './componentes/Filtros.jsx';
import TabelaEquipamentos from './componentes/TabelaEquipamentos.jsx';
import FormularioEquipamento from './componentes/FormularioEquipamento.jsx';
import {
  listarEquipamentos, incluirEquipamento, alterarEquipamento,
  excluirEquipamento, previaInativacao, listarSetores, listarColaboradores
} from './api';

const FILTROS_VAZIOS = { busca: '', id_setor: '', situacao: '', uso_geral: '' };

export default function App() {
  const [equipamentos, setEquipamentos] = useState([]);
  const [setores, setSetores] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [carregando, setCarregando] = useState(true);

  const [painelAberto, setPainelAberto] = useState(false);
  const [edicao, setEdicao] = useState(null);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [avisoInativacao, setAvisoInativacao] = useState(null);

  const [mensagem, setMensagem] = useState(null);

  // Carrega as listas de apoio uma vez
  useEffect(() => {
    listarSetores().then(setSetores).catch(() => setSetores([]));
    listarColaboradores().then(setColaboradores).catch(() => setColaboradores([]));
  }, []);

  const buscar = useCallback(async () => {
    setCarregando(true);
    try {
      setEquipamentos(await listarEquipamentos(filtros));
    } catch (erro) {
      mostrarMensagem('erro', 'Não foi possível carregar os equipamentos. ' +
        'Verifique se a API e o banco estão no ar.');
    } finally {
      setCarregando(false);
    }
  }, [filtros]);

  // Refaz a busca a cada mudança de filtro, com um pequeno atraso para não
  // disparar uma requisição por tecla digitada
  useEffect(() => {
    const tempo = setTimeout(buscar, 250);
    return () => clearTimeout(tempo);
  }, [buscar]);

  function mostrarMensagem(tipo, texto) {
    setMensagem({ tipo, texto });
    setTimeout(() => setMensagem(null), 5000);
  }

  function abrirNovo() {
    setEdicao(null);
    setErros({});
    setAvisoInativacao(null);
    setPainelAberto(true);
  }

  async function abrirEdicao(equipamento) {
    setEdicao(equipamento);
    setErros({});
    setPainelAberto(true);
    // Já busca a prévia para o aviso da RN08 aparecer assim que a pessoa
    // mudar a situação para inativo
    try {
      setAvisoInativacao(await previaInativacao(equipamento.id_equipamento));
    } catch {
      setAvisoInativacao(null);
    }
  }

  function fecharPainel() {
    setPainelAberto(false);
    setEdicao(null);
    setErros({});
  }

  async function salvar(dados) {
    setSalvando(true);
    setErros({});
    try {
      if (edicao) {
        const resposta = await alterarEquipamento(edicao.id_equipamento, dados);
        let texto = `Equipamento ${dados.etiqueta_instituto} alterado.`;
        if (resposta.instancias_inativadas > 0) {
          texto += ` ${resposta.instancias_inativadas} instância` +
            `${resposta.instancias_inativadas > 1 ? 's não transferíveis foram inativadas' : ' não transferível foi inativada'}.`;
        }
        mostrarMensagem('sucesso', texto);
      } else {
        await incluirEquipamento(dados);
        mostrarMensagem('sucesso', `Equipamento ${dados.etiqueta_instituto} cadastrado.`);
      }
      fecharPainel();
      buscar();
    } catch (erro) {
      if (erro.corpo?.erros) {
        setErros(erro.corpo.erros);
      } else {
        mostrarMensagem('erro', erro.corpo?.mensagem || 'Não foi possível salvar.');
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(equipamento) {
    const confirmado = window.confirm(
      `Excluir o equipamento ${equipamento.etiqueta_instituto} — ${equipamento.identificacao}?`
    );
    if (!confirmado) return;

    try {
      await excluirEquipamento(equipamento.id_equipamento);
      mostrarMensagem('sucesso', `Equipamento ${equipamento.etiqueta_instituto} excluído.`);
      buscar();
    } catch (erro) {
      // 409 é o caso previsto: equipamento com vínculo não pode ser excluído
      mostrarMensagem('erro', erro.corpo?.mensagem || 'Não foi possível excluir.');
    }
  }

  return (
    <div className="aplicacao">
      <header className="barra-superior">
        <div>
          <h1>GESLIC</h1>
          <p>Sistema de Gestão de Licenças de Software e Apólices · Instituto Prístino</p>
        </div>
        <span className="identificacao-funcao">RF_B3 · Gerenciar equipamentos</span>
      </header>

      <main className="conteudo">
        <div className="titulo-area">
          <h2>Equipamentos</h2>
          <button type="button" className="botao-principal" onClick={abrirNovo}>
            Novo equipamento
          </button>
        </div>

        {mensagem && (
          <div className={`mensagem mensagem-${mensagem.tipo}`}>{mensagem.texto}</div>
        )}

        <Filtros
          filtros={filtros}
          aoMudar={setFiltros}
          aoLimpar={() => setFiltros(FILTROS_VAZIOS)}
          setores={setores}
          total={equipamentos.length}
        />

        <TabelaEquipamentos
          equipamentos={equipamentos}
          aoEditar={abrirEdicao}
          aoExcluir={excluir}
          carregando={carregando}
        />
      </main>

      {painelAberto && (
        <>
          <div className="fundo-painel" onClick={fecharPainel} />
          <FormularioEquipamento
            edicao={edicao}
            setores={setores}
            colaboradores={colaboradores}
            erros={erros}
            salvando={salvando}
            avisoInativacao={avisoInativacao}
            aoSalvar={salvar}
            aoCancelar={fecharPainel}
          />
        </>
      )}
    </div>
  );
}
