// Tela da função básica RF_B3 - Gerenciar equipamentos (Rafael Celestino Tomiazi).
// Organização: filtros, listagem e painel lateral de inclusão e edição,
// seguindo o protótipo aprovado na ERS (Protótipo 7). A barra superior e o
// menu ficam em components/layout.
//
// Permissões (RN21): o Operador consulta, inclui e inativa (descarte, RN08);
// editar, reativar e excluir são exclusivos do Administrador, e o Operador
// pede a correção por solicitação de ajuste (RF_B10). A inativação exige
// data efetiva e motivo (RN37): o painel mostra o efeito da RN08 nas
// instâncias alocadas antes de confirmar. Os botões seguem as permissões da
// conta, e a API aplica a mesma regra.

import { useCallback, useEffect, useState } from 'react';
import FiltrosEquipamentos from './FiltrosEquipamentos.jsx';
import TabelaEquipamentos from './TabelaEquipamentos.jsx';
import FormularioEquipamento from './FormularioEquipamento.jsx';
import Mensagem from '../../components/common/Mensagem.jsx';
import Sobreposicao from '../../components/common/Sobreposicao.jsx';
import DialogoInativacao from '../../components/common/DialogoInativacao.jsx';
import BotaoSolicitarAjuste from '../../components/solicitacoes/BotaoSolicitarAjuste.jsx';
import FaixaCorrecao from '../../components/solicitacoes/FaixaCorrecao.jsx';
import useAuth from '../../hooks/useAuth';
import useMensagem from '../../hooks/useMensagem';
import useBuscaComAtraso from '../../hooks/useBuscaComAtraso';
import useAbrirPorLink from '../../hooks/useAbrirPorLink';
import { acaoDeLinha } from '../../hooks/usePainelCadastro';
import {
  listarEquipamentos, incluirEquipamento, alterarEquipamento,
  previaInativacao, inativarEquipamento, reativarEquipamento
} from '../../services/equipamentoService';
import { listarSetores } from '../../services/setorService';
import { listarColaboradores } from '../../services/colaboradorService';
import { mensagemDeErro } from '../../services/api';
import { dataDaApi } from '../../utils/mascaras';

const FILTROS_VAZIOS = { busca: '', id_setor: '', situacao: '', uso_geral: '' };

// "1 instância não transferível foi inativada" / "2 instâncias não transferíveis foram inativadas"
function textoInstancias(quantidade) {
  if (!quantidade) return '';
  return quantidade > 1
    ? ` ${quantidade} instâncias não transferíveis foram inativadas.`
    : ' 1 instância não transferível foi inativada.';
}

const listaInstancias = (lista) => lista.map((i) => `${i.identificacao || i.nome_software} (${i.nome_software})`).join(', ');

export default function EquipamentosPage() {
  const { pode } = useAuth();
  const podeIncluir = pode('cadastro.incluir');
  const podeAlterar = pode('cadastro.alterar');
  const podeInativar = pode('cadastro.inativar');

  const [equipamentos, setEquipamentos] = useState([]);
  const [setores, setSetores] = useState([]);
  const [colaboradores, setColaboradores] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [carregando, setCarregando] = useState(true);

  const [painelAberto, setPainelAberto] = useState(false);
  const [edicao, setEdicao] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [avisoInativacao, setAvisoInativacao] = useState(null);
  const [inativando, setInativando] = useState(null); // { equipamento, previa }

  const [mensagem, mostrarMensagem] = useMensagem(6000);

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
      if (erro.status !== 401) {
        mostrarMensagem('erro', 'Não foi possível carregar os equipamentos. Verifique se a API e o banco estão no ar.');
      }
    } finally {
      setCarregando(false);
    }
  }, [filtros, mostrarMensagem]);

  // Refaz a busca a cada mudança de filtro
  useBuscaComAtraso(buscar);

  function abrirNovo() {
    setEdicao(null);
    setErros({});
    setErroGeral('');
    setAvisoInativacao(null);
    setPainelAberto(true);
  }

  const abrirEdicao = useCallback(async (equipamento) => {
    setEdicao(equipamento);
    setErros({});
    setErroGeral('');
    setPainelAberto(true);
    // Já busca a prévia para o aviso da RN08 aparecer assim que a pessoa
    // mudar a situação para inativo
    try {
      setAvisoInativacao(await previaInativacao(equipamento.id_equipamento));
    } catch {
      setAvisoInativacao(null);
    }
  }, []);

  // Aberto por link (solicitação de ajuste ou bens seguráveis): o
  // Administrador já cai na edição; o Operador vê a linha filtrada
  const { idSolicitacao } = useAbrirPorLink(equipamentos, 'id_equipamento', useCallback((eq) => {
    if (podeAlterar) abrirEdicao(eq);
    else setFiltros({ ...FILTROS_VAZIOS, busca: eq.etiqueta_instituto });
  }, [podeAlterar, abrirEdicao]));

  function fecharPainel() {
    setPainelAberto(false);
    setEdicao(null);
    setErros({});
    setErroGeral('');
  }

  async function salvar(dados) {
    setSalvando(true);
    setErros({});
    setErroGeral('');
    try {
      if (edicao) {
        const resposta = await alterarEquipamento(edicao.id_equipamento, dados);
        mostrarMensagem('sucesso',
          `Equipamento ${dados.etiqueta_instituto} alterado.${textoInstancias(resposta.instancias_inativadas)}`);
      } else {
        await incluirEquipamento(dados);
        mostrarMensagem('sucesso', `Equipamento ${dados.etiqueta_instituto} cadastrado.`);
      }
      fecharPainel();
      buscar();
    } catch (erro) {
      if (erro.corpo?.erros) setErros(erro.corpo.erros);
      else setErroGeral(mensagemDeErro(erro, 'Não foi possível salvar.'));
    } finally {
      setSalvando(false);
    }
  }

  // Inativação (descarte): abre o painel com a prévia da RN08
  async function abrirInativacao(equipamento) {
    setErros({});
    setErroGeral('');
    let previa = { nao_transferiveis: [], transferiveis: [] };
    try {
      previa = await previaInativacao(equipamento.id_equipamento);
    } catch {
      // sem a prévia, o painel segue sem o detalhe das instâncias
    }
    setInativando({ equipamento, previa });
  }

  async function confirmarInativacao(evento) {
    const { equipamento } = inativando;
    setSalvando(true);
    setErros({});
    setErroGeral('');
    try {
      const resposta = await inativarEquipamento(equipamento.id_equipamento, evento);
      mostrarMensagem('sucesso', `Equipamento ${equipamento.etiqueta_instituto} inativado em ${dataDaApi(evento.data_efetiva)}.` +
        textoInstancias(resposta.instancias_inativadas));
      setInativando(null);
      buscar();
    } catch (erro) {
      if (erro.corpo?.erros) setErros(erro.corpo.erros);
      else setErroGeral(mensagemDeErro(erro, 'Não foi possível inativar.'));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <main className="conteudo">
        <div className="titulo-area">
          <div>
            <h2>Equipamentos</h2>
            <p className="subtitulo-pagina">Computadores e demais equipamentos que recebem licenças.</p>
          </div>
          {podeIncluir && (
            <button type="button" className="botao-principal" onClick={abrirNovo}>
              Novo equipamento
            </button>
          )}
        </div>

        {!podeAlterar && (
          <p className="nota nota-perfil">
            Seu perfil pode consultar, cadastrar e inativar equipamentos. Para corrigir dados cadastrais, use
            “Solicitar ajuste”: alterar e reativar são exclusivos do perfil Administrador.
          </p>
        )}

        <FaixaCorrecao idSolicitacao={idSolicitacao} />
        <Mensagem mensagem={mensagem} />

        <FiltrosEquipamentos
          filtros={filtros}
          aoMudar={setFiltros}
          aoLimpar={() => setFiltros(FILTROS_VAZIOS)}
          setores={setores}
          total={equipamentos.length}
        />

        <TabelaEquipamentos
          equipamentos={equipamentos}
          aoEditar={podeAlterar ? abrirEdicao : null}
          aoInativar={podeInativar ? abrirInativacao : null}
          aoReativar={podeAlterar ? (eq) => acaoDeLinha({
            confirmar: `Reativar o equipamento ${eq.etiqueta_instituto}? As instâncias inativadas no descarte continuam inativas.`,
            acao: () => reativarEquipamento(eq.id_equipamento),
            sucesso: `Equipamento ${eq.etiqueta_instituto} reativado.`, mostrarMensagem, aoConcluir: buscar
          }) : null}
          acoesExtras={(eq) => (
            <BotaoSolicitarAjuste entidade="equipamento" idRegistro={eq.id_equipamento}
              rotulo={`${eq.etiqueta_instituto} · ${eq.identificacao}`}
              aoEmitida={(r) => mostrarMensagem('sucesso', `${r.codigo} enviada ao Administrador.`)} />
          )}
          carregando={carregando}
        />
      </main>

      {painelAberto && (
        <Sobreposicao aoFechar={fecharPainel}>
          <FormularioEquipamento
            edicao={edicao}
            setores={setores}
            colaboradores={colaboradores}
            erros={erros}
            erroGeral={erroGeral}
            salvando={salvando}
            avisoInativacao={avisoInativacao}
            aoSalvar={salvar}
            aoCancelar={fecharPainel}
          />
        </Sobreposicao>
      )}

      {inativando && (
        <DialogoInativacao
          titulo="Inativar equipamento"
          subtitulo={`${inativando.equipamento.etiqueta_instituto} · ${inativando.equipamento.identificacao} · ID ${inativando.equipamento.id_equipamento}`}
          dicaData="Quando o equipamento deixou de ser usado."
          motivoObrigatorio
          botao="Inativar equipamento"
          detalhes={[
            ['Setor', inativando.equipamento.nome_setor],
            ['Responsável', inativando.equipamento.uso_geral ? 'uso geral' : inativando.equipamento.nome_responsavel],
            ['Licenças', [...inativando.previa.nao_transferiveis.map((i) => `${i.identificacao || i.nome_software} (não transferível)`),
              ...inativando.previa.transferiveis.map((i) => i.identificacao || i.nome_software)].join(' · ') || 'nenhuma']
          ]}
          erros={erros}
          salvando={salvando}
          aoFechar={() => setInativando(null)}
          aoConfirmar={confirmarInativacao}
        >
          {erroGeral && <div className="mensagem mensagem-erro">{erroGeral}</div>}
          <p className="aviso">
            <strong>Inativar significa descarte (RN08).</strong>
            {inativando.previa.nao_transferiveis.length > 0 && (
              <> A(s) instância(s) não transferível(is) alocada(s) ({listaInstancias(inativando.previa.nao_transferiveis)}) fica(m) inativa(s) na mesma data efetiva.</>
            )}
            {inativando.previa.transferiveis.length > 0 && (
              <> A(s) transferível(is) ({listaInstancias(inativando.previa.transferiveis)}) continua(m) ativa(s) e pode(m) ser liberada(s) ou transferida(s).</>
            )}
            {inativando.previa.nao_transferiveis.length + inativando.previa.transferiveis.length === 0 && (
              <> Nenhuma instância de licença está alocada a este equipamento.</>
            )}
          </p>
        </DialogoInativacao>
      )}
    </>
  );
}
