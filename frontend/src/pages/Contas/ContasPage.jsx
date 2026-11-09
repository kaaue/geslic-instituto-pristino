// Gerenciar usuários (Protótipos 13, 13.1 e 13.2; RF_B8, RN21, RN27, RN41).
// Tela exclusiva do Administrador (permissão usuario.gerenciar): solicitações
// de acesso, contas e a matriz explicativa (não editável) de perfis e
// permissões. A tabela tem uma única ação por linha, "Gerenciar", que abre o
// painel lateral da conta com as operações autorizadas (editar, perfil, senha
// provisória, desativar ou reativar, transferir privilégios). As regras
// (último Administrador, motivo ao conceder o perfil, encerramento de
// sessões, e-mail @pristino.org.br, conta ligada a colaborador) são
// aplicadas pela API; a tela explica e mostra o resultado que a API devolveu.
// O painel inicial abre a aprovação direto por /contas?aprovar=ID.

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useMensagem from '../../hooks/useMensagem';
import useBuscaComAtraso from '../../hooks/useBuscaComAtraso';
import Mensagem from '../../components/common/Mensagem.jsx';
import Sobreposicao from '../../components/common/Sobreposicao.jsx';
import { Janela } from '../../components/common/PainelLateral.jsx';
import TabelaContas from './TabelaContas.jsx';
import PainelConta from './PainelConta.jsx';
import MatrizPermissoes from './MatrizPermissoes.jsx';
import ModalTransferencia from './ModalTransferencia.jsx';
import * as servico from '../../services/usuarioService';
import { listarColaboradores } from '../../services/colaboradorService';
import { listarSetores } from '../../services/setorService';
import { mensagemDeErro } from '../../services/api';

const FILTROS_VAZIOS = { busca: '', id_perfil: '', situacao: '', id_setor: '' };
const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

export default function ContasPage() {
  const { usuario } = useAuth();
  const [aba, setAba] = useState('contas');
  const [contas, setContas] = useState([]);
  const [perfis, setPerfis] = useState({ perfis: [], matriz: [] });
  const [parametros, setParametros] = useSearchParams();
  const [erroGeral, setErroGeral] = useState('');
  const [colaboradores, setColaboradores] = useState([]);
  const [setores, setSetores] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState(null); // { tipo, conta }
  const [transferencia, setTransferencia] = useState(null); // { inicial }
  const [erros, setErros] = useState({});
  const [homonimos, setHomonimos] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarSenha, setConfirmarSenha] = useState(null); // conta
  const [senhaGerada, setSenhaGerada] = useState(null); // { login, senha, expira }
  const [copiada, setCopiada] = useState(false);
  const [mensagem, mostrarMensagem] = useMensagem(8000);

  const carregarPerfis = useCallback(() => {
    servico.listarPerfis().then(setPerfis).catch((e) => mostrarMensagem('erro', mensagemDeErro(e)));
  }, [mostrarMensagem]);

  const carregarColaboradores = useCallback(() => {
    listarColaboradores().then(setColaboradores).catch(() => setColaboradores([]));
  }, []);

  useEffect(() => {
    carregarPerfis();
    carregarColaboradores();
    listarSetores().then(setSetores).catch(() => setSetores([]));
  }, [carregarPerfis, carregarColaboradores]);

  const buscar = useCallback(async () => {
    setCarregando(true);
    try {
      setContas(await servico.listarContas(filtros));
    } catch (e) {
      mostrarMensagem('erro', mensagemDeErro(e, 'Não foi possível carregar as contas.'));
    } finally {
      setCarregando(false);
    }
  }, [filtros, mostrarMensagem]);

  useBuscaComAtraso(buscar);

  function abrir(tipo, conta = null) {
    setErros({});
    setErroGeral('');
    setHomonimos(null);
    setAcao({ tipo, conta });
  }

  function fechar() {
    setAcao(null);
    setErros({});
    setErroGeral('');
    setHomonimos(null);
  }

  // Revisar e aprovar, vindo do painel (/contas?aprovar=ID)
  const idAprovar = Number(parametros.get('aprovar')) || null;
  useEffect(() => {
    if (!idAprovar || carregando) return;
    const conta = contas.find((x) => x.id_usuario === idAprovar && x.situacao === 'pendente');
    const restantes = new URLSearchParams(parametros);
    restantes.delete('aprovar');
    setParametros(restantes, { replace: true });
    if (conta) abrir('aprovar', conta);
    else mostrarMensagem('aviso', 'Esta solicitação de acesso já foi tratada.');
  }, [idAprovar, contas, carregando, parametros, setParametros, mostrarMensagem]);

  function mostrarSenha(login, resposta) {
    setCopiada(false);
    setSenhaGerada({ login, senha: resposta.senha_provisoria, expira: resposta.senha_expira_em });
  }

  // Executa a operação do painel; a mensagem reflete a resposta da API
  async function confirmar(dados) {
    const { tipo, conta } = acao;
    setSalvando(true);
    setErros({});
    setErroGeral('');
    try {
      if (tipo === 'nova') {
        const r = await servico.criarConta(dados);
        mostrarSenha(r.conta.login, r);
        mostrarMensagem('sucesso', `Conta ${r.conta.login} criada com sucesso, com perfil ${r.conta.perfil} e ligada a ${r.conta.nome_colaborador}.`);
      } else if (tipo === 'editar') {
        await servico.atualizarConta(conta.id_usuario, dados);
        mostrarMensagem('sucesso', `Dados da conta ${dados.login} atualizados com sucesso.`);
      } else if (tipo === 'aprovar') {
        const r = await servico.aprovarConta(conta.id_usuario, dados);
        mostrarMensagem('sucesso', `Acesso de ${r.login} aprovado com sucesso, com perfil ${r.perfil} e ligado a ${r.nome_colaborador}.`);
      } else if (tipo === 'recusar') {
        await servico.recusarConta(conta.id_usuario, dados.motivo);
        mostrarMensagem('sucesso', `Solicitação de ${conta.login} recusada.`);
      } else if (tipo === 'perfil') {
        const r = await servico.alterarPerfil(conta.id_usuario, dados);
        mostrarMensagem('sucesso', `Perfil de ${r.login} alterado com sucesso para ${r.perfil}. As sessões abertas da conta foram encerradas.`);
      } else if (tipo === 'situacao') {
        const r = await servico.alterarSituacao(conta.id_usuario, dados.situacao, dados.motivo);
        mostrarMensagem('sucesso', `Conta ${r.login} ${r.situacao === 'ativo' ? 'reativada' : 'desativada'} com sucesso.`);
      }
      fechar();
      buscar();
      carregarPerfis();
      carregarColaboradores();
    } catch (e) {
      if (e.corpo?.codigo === 'COLABORADOR_HOMONIMO') {
        setHomonimos(e.corpo.homonimos || []);
        setErroGeral(e.corpo.mensagem);
      } else if (e.corpo?.erros) setErros(e.corpo.erros);
      else setErroGeral(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function transferir(dados) {
    setSalvando(true);
    setErros({});
    setErroGeral('');
    try {
      const r = await servico.transferirAdministrador(dados);
      mostrarMensagem('sucesso', `Privilégios transferidos com sucesso: ${r.concedida.nome} agora é Administrador; ${r.revogada.nome} ` +
        `${r.revogada.situacao === 'inativo' ? 'teve a conta desativada' : 'passou a Operador e continua ativa'}.`);
      setTransferencia(null);
      fechar();
      buscar();
      carregarPerfis();
    } catch (e) {
      if (e.corpo?.erros) setErros(e.corpo.erros);
      setErroGeral(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function gerarSenha() {
    const conta = confirmarSenha;
    setSalvando(true);
    try {
      const r = await servico.definirSenhaProvisoria(conta.id_usuario);
      setConfirmarSenha(null);
      mostrarSenha(conta.login, r);
      buscar();
    } catch (e) {
      setConfirmarSenha(null);
      mostrarMensagem('erro', mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  // Área de transferência: a API moderna exige página segura (https ou
  // localhost) e foco; sem ela, usa a cópia por seleção, que funciona em http.
  // A senha não vai para logs nem fica gravada no navegador.
  async function copiarSenha() {
    try {
      await navigator.clipboard.writeText(senhaGerada.senha);
      setCopiada(true);
      return;
    } catch {
      // segue para a alternativa abaixo
    }
    const area = document.createElement('textarea');
    area.value = senhaGerada.senha;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (ok) setCopiada(true);
    else mostrarMensagem('erro', 'Não foi possível copiar automaticamente. Selecione a senha e copie manualmente.');
  }

  function abrirTransferencia(conta = null) {
    setErros({});
    setErroGeral('');
    const inicial = !conta ? {} : conta.perfil === 'Administrador'
      ? { id_revogada: conta.id_usuario } : { id_concedida: conta.id_usuario };
    setTransferencia({ inicial });
  }

  const pendentes = contas.filter((c) => c.situacao === 'pendente').length;
  const administradoresAtivos = perfis.perfis.find((p) => p.nome === 'Administrador')?.contas_ativas ?? 0;

  return (
    <main className="conteudo">
      <div className="titulo-area">
        <div>
          <h2>Gerenciar usuários</h2>
          <p className="subtitulo">
            Exclusivo do Administrador · {administradoresAtivos} administrador(es) ativo(s); o sistema mantém sempre ao menos um (RN27).
          </p>
        </div>
        {aba === 'contas' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="botao-secundario" onClick={() => abrirTransferencia()}>Transferir privilégios de administrador</button>
            <button type="button" className="botao-principal" onClick={() => abrir('nova')}>Nova conta</button>
          </div>
        )}
      </div>

      <div className="abas-internas" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'contas'} className={aba === 'contas' ? 'aba-interna ativa' : 'aba-interna'} onClick={() => setAba('contas')}>
          Usuários
        </button>
        <button type="button" role="tab" aria-selected={aba === 'perfis'} className={aba === 'perfis' ? 'aba-interna ativa' : 'aba-interna'} onClick={() => setAba('perfis')}>
          Perfis e permissões
        </button>
      </div>

      <Mensagem mensagem={mensagem} />

      {aba === 'perfis' ? (
        <MatrizPermissoes dados={perfis} />
      ) : (
        <>
          {pendentes > 0 && filtros.situacao !== 'pendente' && (
            <div className="mensagem mensagem-aviso" role="status">
              {pendentes === 1 ? '1 solicitação de acesso aguarda' : `${pendentes} solicitações de acesso aguardam`} aprovação.{' '}
              <button type="button" className="botao-texto" onClick={() => setFiltros({ ...FILTROS_VAZIOS, situacao: 'pendente' })}>
                Ver solicitações
              </button>
            </div>
          )}

          <div className="filtros">
            <div className="linha-filtros">
              <label className="campo campo-busca">
                <span>Buscar</span>
                <input type="text" placeholder="nome, login ou e-mail" value={filtros.busca}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} />
              </label>
              <label className="campo">
                <span>Perfil</span>
                <select value={filtros.id_perfil} onChange={(e) => setFiltros({ ...filtros, id_perfil: e.target.value })}>
                  <option value="">Todos</option>
                  {perfis.perfis.map((p) => <option key={p.id_perfil} value={p.id_perfil}>{p.nome}</option>)}
                </select>
              </label>
              <label className="campo">
                <span>Situação</span>
                <select value={filtros.situacao} onChange={(e) => setFiltros({ ...filtros, situacao: e.target.value })}>
                  <option value="">Todas</option>
                  <option value="pendente">Aguardando aprovação</option>
                  <option value="ativo">Ativas</option>
                  <option value="inativo">Desativadas</option>
                </select>
              </label>
              <label className="campo">
                <span>Setor</span>
                <select value={filtros.id_setor} onChange={(e) => setFiltros({ ...filtros, id_setor: e.target.value })}>
                  <option value="">Todos</option>
                  {setores.map((s) => <option key={s.id_setor} value={s.id_setor}>{s.nome}</option>)}
                </select>
              </label>
              {Object.values(filtros).some(Boolean) && (
                <button type="button" className="botao-texto" onClick={() => setFiltros(FILTROS_VAZIOS)}>Limpar filtros</button>
              )}
            </div>
            <p className="resumo-filtro">
              {contas.length} conta(s){pendentes ? ` · ${pendentes} aguardando aprovação` : ''}
            </p>
          </div>

          <TabelaContas
            contas={contas}
            carregando={carregando}
            idContaAtual={usuario.id_usuario}
            aoGerenciar={(c) => abrir(c.situacao === 'pendente' ? 'aprovar' : 'gerenciar', c)}
          />
        </>
      )}

      {acao && (
        <Sobreposicao aoFechar={fechar}>
          <PainelConta
            key={acao.tipo}
            tipo={acao.tipo}
            conta={acao.conta}
            perfis={perfis.perfis}
            colaboradores={colaboradores}
            setores={setores}
            erros={erros}
            erroGeral={erroGeral}
            homonimos={homonimos}
            salvando={salvando}
            idContaAtual={usuario.id_usuario}
            aoTrocarAcao={(tipo) => abrir(tipo, acao.conta)}
            aoConfirmar={confirmar}
            aoCancelar={fechar}
            aoSenhaProvisoria={(conta) => setConfirmarSenha(conta)}
            aoTransferir={(conta) => abrirTransferencia(conta)}
          />
        </Sobreposicao>
      )}

      {transferencia && (
        <ModalTransferencia contas={contas} idContaAtual={usuario.id_usuario} inicial={transferencia.inicial}
          erros={erros} erroGeral={erroGeral} salvando={salvando}
          aoConfirmar={transferir} aoFechar={() => { setTransferencia(null); setErroGeral(''); setErros({}); }} />
      )}

      {confirmarSenha && (
        <Janela
          titulo="Gerar senha provisória"
          subtitulo={`${confirmarSenha.nome} · ${confirmarSenha.login}`}
          aoFechar={() => setConfirmarSenha(null)}
          aoEnviar={gerarSenha}
          rodape={(
            <>
              <button type="button" className="botao-secundario" onClick={() => setConfirmarSenha(null)}>Cancelar</button>
              <button type="submit" className="botao-principal" disabled={salvando}>{salvando ? 'Gerando...' : 'Gerar senha'}</button>
            </>
          )}
        >
          <p className="aviso">
            <strong>A senha atual de {confirmarSenha.nome} deixa de valer.</strong>
            As sessões abertas da conta são encerradas e a troca será obrigatória no próximo acesso.
            A senha provisória tem prazo de validade.
          </p>
        </Janela>
      )}

      {senhaGerada && (
        <Janela
          titulo="Senha provisória"
          subtitulo={`Conta ${senhaGerada.login}`}
          aoFechar={() => setSenhaGerada(null)}
          rodape={<button type="button" className="botao-principal" onClick={() => setSenhaGerada(null)}>Entendi</button>}
        >
          <div className="senha-copia">
            <p className="senha-provisoria"><code>{senhaGerada.senha}</code></p>
            <button type="button" className="botao-secundario" onClick={copiarSenha}>Copiar senha</button>
            {copiada && <span className="senha-copiada" role="status">✓ Senha copiada</span>}
          </div>
          <p className="aviso">
            <strong>Ela não será mostrada de novo.</strong>
            Entregue-a à pessoa por um canal seguro.
            {senhaGerada.expira ? ` Vale até ${dataHora(senhaGerada.expira)};` : ''} no primeiro acesso, a troca da senha é obrigatória.
          </p>
        </Janela>
      )}
    </main>
  );
}
