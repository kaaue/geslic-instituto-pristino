// Contas e perfis de acesso (Protótipos 13, 13.1 e 13.2; RF_B8, RN21, RN27, RN41).
// Tela exclusiva do Administrador (permissão usuario.gerenciar): solicitações
// de acesso, contas, troca de gestão e a matriz explicativa (não editável) de
// perfis e permissões. As regras (último Administrador, motivo ao conceder o
// perfil, encerramento de sessões, e-mail @pristino.org.br) são aplicadas
// pela API; a tela explica e mostra o resultado. Não há "último acesso".
// O painel abre a aprovação direto por /contas?aprovar=ID.

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useMensagem from '../../hooks/useMensagem';
import useBuscaComAtraso from '../../hooks/useBuscaComAtraso';
import Mensagem from '../../components/common/Mensagem.jsx';
import Sobreposicao from '../../components/common/Sobreposicao.jsx';
import TabelaContas from './TabelaContas.jsx';
import PainelConta from './PainelConta.jsx';
import MatrizPermissoes from './MatrizPermissoes.jsx';
import ModalTransferencia from './ModalTransferencia.jsx';
import * as servico from '../../services/usuarioService';
import { listarColaboradores } from '../../services/colaboradorService';
import { mensagemDeErro } from '../../services/api';

const FILTROS_VAZIOS = { busca: '', id_perfil: '', situacao: '' };

export default function ContasPage() {
  const { usuario } = useAuth();
  const [aba, setAba] = useState('contas');
  const [contas, setContas] = useState([]);
  const [perfis, setPerfis] = useState({ perfis: [], matriz: [] });
  const [parametros, setParametros] = useSearchParams();
  const [erroGeral, setErroGeral] = useState('');
  const [colaboradores, setColaboradores] = useState([]);
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState(null); // { tipo, conta }
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState(null); // { login, senha }
  const [mensagem, mostrarMensagem] = useMensagem(7000);

  const carregarPerfis = useCallback(() => {
    servico.listarPerfis().then(setPerfis).catch((e) => mostrarMensagem('erro', mensagemDeErro(e)));
  }, [mostrarMensagem]);

  useEffect(() => {
    carregarPerfis();
    listarColaboradores().then(setColaboradores).catch(() => setColaboradores([]));
  }, [carregarPerfis]);

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
    setAcao({ tipo, conta });
  }

  function fechar() {
    setAcao(null);
    setErros({});
    setErroGeral('');
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

  // Executa a ação do painel e trata os erros de campo
  async function confirmar(dados) {
    const { tipo, conta } = acao;
    setSalvando(true);
    setErros({});
    try {
      if (tipo === 'nova') {
        const r = await servico.criarConta(dados);
        setSenhaGerada({ login: r.conta.login, senha: r.senha_provisoria });
        mostrarMensagem('sucesso', `Conta ${r.conta.login} criada com perfil ${r.conta.perfil}.`);
      } else if (tipo === 'editar') {
        await servico.atualizarConta(conta.id_usuario, dados);
        mostrarMensagem('sucesso', `Dados da conta ${dados.login} atualizados.`);
      } else if (tipo === 'aprovar') {
        const r = await servico.aprovarConta(conta.id_usuario, dados);
        mostrarMensagem('sucesso', `Acesso de ${r.login} aprovado com perfil ${r.perfil}.`);
      } else if (tipo === 'recusar') {
        await servico.recusarConta(conta.id_usuario, dados.motivo);
        mostrarMensagem('sucesso', `Solicitação de ${conta.login} recusada.`);
      } else if (tipo === 'perfil') {
        const r = await servico.alterarPerfil(conta.id_usuario, dados);
        mostrarMensagem('sucesso', `Perfil de ${r.login} alterado para ${r.perfil}. As sessões abertas da conta foram encerradas.`);
      } else if (tipo === 'situacao') {
        const r = await servico.alterarSituacao(conta.id_usuario, dados.situacao, dados.motivo);
        mostrarMensagem('sucesso', `Conta ${r.login} ${r.situacao === 'ativo' ? 'reativada' : 'desativada'}.`);
      } else if (tipo === 'transferencia') {
        const r = await servico.transferirAdministrador(dados);
        mostrarMensagem('sucesso', `Troca de gestão registrada: ${r.concedida.nome} é Administrador; ${r.revogada.nome} ` +
          `${r.revogada.situacao === 'inativo' ? 'teve a conta inativada' : 'passou a Operador'}. As sessões das duas contas foram encerradas.`);
      }
      fechar();
      buscar();
      carregarPerfis();
    } catch (e) {
      if (e.corpo?.erros) setErros(e.corpo.erros);
      else setErroGeral(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function senhaProvisoria(conta) {
    const ok = window.confirm(
      `Gerar uma senha provisória para ${conta.login}? A senha atual deixa de valer, as sessões abertas ` +
      'da conta são encerradas e a troca será obrigatória no próximo acesso.');
    if (!ok) return;
    try {
      const r = await servico.definirSenhaProvisoria(conta.id_usuario);
      setSenhaGerada({ login: conta.login, senha: r.senha_provisoria });
    } catch (e) {
      mostrarMensagem('erro', mensagemDeErro(e));
    }
  }

  const pendentes = contas.filter((c) => c.situacao === 'pendente').length;
  const administradoresAtivos = perfis.perfis.find((p) => p.nome === 'Administrador')?.contas_ativas ?? 0;

  return (
    <main className="conteudo">
      <div className="titulo-area">
        <div>
          <h2>Contas e perfis de acesso</h2>
          <p className="subtitulo">
            Exclusivo do Administrador · {administradoresAtivos} administrador(es) ativo(s); o sistema mantém sempre ao menos um (RN27).
          </p>
        </div>
        {aba === 'contas' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="botao-secundario" onClick={() => abrir('transferencia')}>Transferir privilégios de administrador</button>
            <button type="button" className="botao-principal" onClick={() => abrir('nova')}>Nova conta</button>
          </div>
        )}
      </div>

      <div className="abas-internas" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'contas'} className={aba === 'contas' ? 'aba-interna ativa' : 'aba-interna'} onClick={() => setAba('contas')}>
          Contas
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
              {Object.values(filtros).some(Boolean) && (
                <button type="button" className="botao-secundario" onClick={() => setFiltros(FILTROS_VAZIOS)}>Limpar</button>
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
            aoAgir={abrir}
            aoSenhaProvisoria={senhaProvisoria}
          />
        </>
      )}

      {acao?.tipo === 'transferencia' && (
        <ModalTransferencia contas={contas} erros={erros} erroGeral={erroGeral} salvando={salvando}
          aoConfirmar={confirmar} aoFechar={fechar} />
      )}

      {acao && acao.tipo !== 'transferencia' && (
        <Sobreposicao aoFechar={fechar}>
          <PainelConta
            tipo={acao.tipo}
            conta={acao.conta}
            perfis={perfis.perfis}
            colaboradores={colaboradores}
            erros={erros}
            erroGeral={erroGeral}
            salvando={salvando}
            idContaAtual={usuario.id_usuario}
            aoTrocarAcao={(tipo) => abrir(tipo, acao.conta)}
            aoConfirmar={confirmar}
            aoCancelar={fechar}
          />
        </Sobreposicao>
      )}

      {senhaGerada && (
        <Sobreposicao aoFechar={() => setSenhaGerada(null)}>
          <div className="janela" role="dialog" aria-labelledby="titulo-senha">
            <header className="painel-cabecalho"><h2 id="titulo-senha">Senha provisória</h2></header>
            <div className="painel-corpo">
              <p>Senha provisória da conta <strong>{senhaGerada.login}</strong>:</p>
              <p className="senha-provisoria"><code>{senhaGerada.senha}</code></p>
              <p className="aviso">
                <strong>Ela não será mostrada de novo.</strong>
                Entregue-a pessoalmente à pessoa. No primeiro acesso, a troca da senha é obrigatória.
              </p>
            </div>
            <footer className="painel-rodape">
              <button type="button" className="botao-principal" onClick={() => setSenhaGerada(null)}>Entendi</button>
            </footer>
          </div>
        </Sobreposicao>
      )}
    </main>
  );
}
