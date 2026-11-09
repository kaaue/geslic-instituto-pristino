// Tela da RF_B4 - Gerenciar colaboradores (Protótipo 8).
// Cadastro mínimo das pessoas do Instituto; não cria conta de acesso.
// Nome igual a outro gera aviso de possível homônimo e permite continuar; o
// e-mail repetido é bloqueado (RN19). O Operador inclui e, para corrigir
// dados, usa "Solicitar ajuste"; corrigir, desligar, reativar e excluir são
// do Administrador. O desligamento exige data efetiva (RN37), encerra as
// utilizações e deixa as instâncias ativas e vagas (RN07); o colaborador
// desligado aparece esmaecido, com a data. A participação em projetos é
// mostrada aqui e gerenciada no cadastro do projeto (RN38).

import { useCallback, useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useMensagem from '../../hooks/useMensagem';
import useListagem from '../../hooks/useListagem';
import useAbrirPorLink from '../../hooks/useAbrirPorLink';
import usePainelCadastro, { acaoDeLinha } from '../../hooks/usePainelCadastro';
import Mensagem from '../../components/common/Mensagem.jsx';
import Campo from '../../components/common/Campo.jsx';
import PainelLateral from '../../components/common/PainelLateral.jsx';
import DialogoInativacao from '../../components/common/DialogoInativacao.jsx';
import BotaoSolicitarAjuste from '../../components/solicitacoes/BotaoSolicitarAjuste.jsx';
import FaixaCorrecao from '../../components/solicitacoes/FaixaCorrecao.jsx';
import { colaboradorCadastro as servico } from '../../services/colaboradorService';
import { listarSetores } from '../../services/setorService';
import { dataDaApi } from '../../utils/mascaras';

const FILTROS = { busca: '', id_setor: '', situacao: '' };

function FormularioColaborador({ registro, setores, controle, aoSalvar, ehOperador }) {
  const [form, setForm] = useState({
    nome: registro?.nome || '', id_setor: registro?.id_setor ? String(registro.id_setor) : '',
    cargo: registro?.cargo || '', email: registro?.email || ''
  });
  const [homonimos, setHomonimos] = useState([]);
  const [participacoes, setParticipacoes] = useState(null);
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  const { erros, erroGeral, salvando, fechar } = controle;
  const comErro = (campo) => (erros[campo] ? 'com-erro' : '');

  // Aviso de possível homônimo enquanto o nome é digitado (RN19)
  useEffect(() => {
    const nome = form.nome.trim();
    if (nome.length < 3) {
      setHomonimos([]);
      return undefined;
    }
    const tempo = setTimeout(() => {
      servico.homonimos(nome, registro?.id_colaborador).then(setHomonimos).catch(() => setHomonimos([]));
    }, 350);
    return () => clearTimeout(tempo);
  }, [form.nome, registro]);

  useEffect(() => {
    if (registro) servico.buscar(registro.id_colaborador).then((c) => setParticipacoes(c.participacoes)).catch(() => {});
  }, [registro]);

  // O setor atual continua na lista, mesmo que tenha sido inativado
  const opcoesSetor = [...setores];
  if (registro && !opcoesSetor.some((s) => s.id_setor === registro.id_setor)) {
    opcoesSetor.unshift({ id_setor: registro.id_setor, nome: `${registro.nome_setor} (inativo)` });
  }

  return (
    <PainelLateral
      titulo={registro ? 'Editar colaborador' : 'Novo colaborador'}
      subtitulo={registro ? `${registro.nome} · ID ${registro.id_colaborador}` : (ehOperador ? 'Inclusão pelo perfil Operador' : 'O ID é gerado pelo sistema ao salvar.')}
      aoFechar={fechar}
      aoEnviar={() => aoSalvar(form)}
      rodape={(
        <>
          <button type="button" className="botao-secundario" onClick={fechar}>Cancelar</button>
          <button type="submit" className="botao-principal" disabled={salvando}>
            {salvando ? 'Salvando...' : registro ? 'Salvar alterações' : 'Salvar'}
          </button>
        </>
      )}
    >
      {erroGeral && <div className="mensagem mensagem-erro">{erroGeral}</div>}
      <Campo rotulo="Nome *" erro={erros.nome}>
        <input type="text" value={form.nome} maxLength={120} onChange={mudar('nome')} className={comErro('nome')} autoFocus />
      </Campo>
      {homonimos.length > 0 && (
        <p className="aviso">
          <strong>Possível homônimo:</strong>
          já existe {homonimos.map((h) => `${h.nome} em ${h.nome_setor}${h.ativo ? '' : ' (desligado)'}`).join('; ')}.
          Se for outra pessoa, continue o cadastro (RN19).
        </p>
      )}
      <div className="dupla">
        <Campo rotulo="Setor *" erro={erros.id_setor}>
          <select value={form.id_setor} onChange={mudar('id_setor')} className={comErro('id_setor')}>
            <option value="">Selecione</option>
            {opcoesSetor.map((s) => <option key={s.id_setor} value={s.id_setor}>{s.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Cargo" erro={erros.cargo}>
          <input type="text" value={form.cargo} maxLength={80} onChange={mudar('cargo')} className={comErro('cargo')} />
        </Campo>
      </div>
      <Campo rotulo="E-mail" erro={erros.email}>
        <input type="email" value={form.email} maxLength={120} onChange={mudar('email')} className={comErro('email')} />
      </Campo>
      {registro && (
        <div>
          <h3 className="titulo-secao-painel">Projetos de que participa <span className="pilula">somente leitura</span></h3>
          {participacoes === null ? <p className="bloco-pendente">Carregando...</p> : participacoes.length === 0 ? (
            <p className="bloco-pendente">Nenhum projeto.</p>
          ) : (
            <div className="pilulas" style={{ marginTop: 8 }}>
              {participacoes.map((p) => <span key={p.id_projeto} className="pilula">{p.codigo} · {p.nome}</span>)}
            </div>
          )}
          <p className="nota" style={{ marginTop: 8 }}>A participação é gerenciada no cadastro do projeto (RN38).</p>
        </div>
      )}
      <p className="nota">O desligamento, feito pelo Administrador, exige data efetiva; a data e a hora do registro são guardadas separadamente (RN37).</p>
    </PainelLateral>
  );
}

function DialogoDesligamento({ registro, controle, aoConfirmar }) {
  const [previa, setPrevia] = useState(null);
  useEffect(() => {
    servico.previaDesligamento(registro.id_colaborador).then(setPrevia).catch(() => setPrevia(null));
  }, [registro]);

  return (
    <DialogoInativacao
      titulo="Desligar colaborador"
      subtitulo={`${registro.nome} · ${registro.nome_setor} · ID ${registro.id_colaborador}`}
      rotuloData="Data efetiva do desligamento"
      dicaData="Quando a pessoa deixou o Instituto. Não pode ser futura."
      botao="Desligar colaborador"
      detalhes={[
        ['E-mail', registro.email],
        ['Projetos', registro.projetos],
        ['Licenças em uso', previa ? (previa.utilizacoes.map((u) => `${u.identificacao || u.licenca} (${u.nome_software})`).join(', ') || 'nenhuma') : '...']
      ]}
      erros={controle.erros}
      salvando={controle.salvando}
      aoFechar={controle.fechar}
      aoConfirmar={aoConfirmar}
    >
      {controle.erroGeral && <div className="mensagem mensagem-erro">{controle.erroGeral}</div>}
      <p className="aviso">
        <strong>Desligar encerra as utilizações (RN07).</strong>
        As licenças usadas pela pessoa encerram na data efetiva; as instâncias continuam ativas e passam a vagas, com o histórico preservado.
      </p>
      {previa?.setores_coordenados.length > 0 && (
        <p className="aviso">
          <strong>Coordenação de setor:</strong>
          {previa.setores_coordenados.map((s) => s.nome).join(', ')} ficará sem coordenador — o coordenador é sempre um colaborador ativo.
        </p>
      )}
      {previa && (previa.equipamentos_responsavel.length > 0 || previa.projetos_responsavel.length > 0) && (
        <p className="aviso-info">
          Continua como responsável por{' '}
          {[previa.equipamentos_responsavel.length && `equipamento(s) ${previa.equipamentos_responsavel.join(', ')}`,
            previa.projetos_responsavel.length && `projeto(s) ${previa.projetos_responsavel.map((p) => p.codigo).join(', ')}`]
            .filter(Boolean).join(' e ')}: corrija esses cadastros, se for o caso.
        </p>
      )}
      {previa?.conta?.situacao === 'ativo' && (
        <p className="aviso-info">
          A conta de acesso <strong>{previa.conta.login}</strong> continua ativa: o cadastro de colaborador e a conta são separados.
          Desative a conta em Contas e perfis, se for o caso.
        </p>
      )}
    </DialogoInativacao>
  );
}

export default function ColaboradoresPage() {
  const { pode } = useAuth();
  const [mensagem, mostrarMensagem] = useMensagem(7000);
  const [setores, setSetores] = useState([]);
  const listar = useCallback((f) => servico.listar(f), []);
  const { itens, filtros, setFiltros, carregando, recarregar, limpar } =
    useListagem(listar, FILTROS, (texto) => mostrarMensagem('erro', texto));
  const controle = usePainelCadastro(mostrarMensagem, recarregar);
  const { painel, abrir, executar } = controle;
  const { idSolicitacao } = useAbrirPorLink(itens, 'id_colaborador', useCallback((c) => abrir('form', c), [abrir]));
  const podeAlterar = pode('cadastro.alterar');

  useEffect(() => {
    listarSetores().then(setSetores).catch(() => setSetores([]));
  }, []);

  function salvar(form) {
    const registro = painel.registro;
    executar(
      () => (registro ? servico.alterar(registro.id_colaborador, form) : servico.incluir(form)),
      (c) => `Colaborador ${c.nome} ${registro ? 'atualizado' : 'cadastrado'}.`
    );
  }

  function desligar(evento) {
    const registro = painel.registro;
    executar(() => servico.inativar(registro.id_colaborador, evento), (r) => {
      const efeitos = [];
      if (r.utilizacoes_encerradas) efeitos.push(`${r.utilizacoes_encerradas} utilização(ões) encerrada(s)`);
      if (r.setores_sem_coordenador.length) efeitos.push(`${r.setores_sem_coordenador.join(', ')} ficou sem coordenador`);
      return `${registro.nome} desligado em ${dataDaApi(evento.data_efetiva)}${efeitos.length ? `: ${efeitos.join('; ')}` : ''}.`;
    });
  }

  const desligados = itens.filter((c) => !c.ativo).length;

  return (
    <>
      <main className="conteudo">
        <div className="titulo-area">
          <div>
            <h2>Colaboradores</h2>
            <p className="subtitulo-pagina">Cadastro mínimo das pessoas do Instituto. O cadastro não cria conta de acesso.</p>
          </div>
          {pode('cadastro.incluir') && (
            <button type="button" className="botao-principal" onClick={() => abrir('form')}>Novo colaborador</button>
          )}
        </div>

        <FaixaCorrecao idSolicitacao={idSolicitacao} />
        <Mensagem mensagem={mensagem} />

        <div className="filtros">
          <div className="linha-filtros">
            <label className="campo campo-busca">
              <span>Nome, e-mail ou cargo</span>
              <input type="search" placeholder="Pesquisar..." value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} />
            </label>
            <label className="campo">
              <span>Setor</span>
              <select value={filtros.id_setor} onChange={(e) => setFiltros({ ...filtros, id_setor: e.target.value })}>
                <option value="">Todos</option>
                {setores.map((s) => <option key={s.id_setor} value={s.id_setor}>{s.nome}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Situação</span>
              <select value={filtros.situacao} onChange={(e) => setFiltros({ ...filtros, situacao: e.target.value })}>
                <option value="">Todas</option>
                <option value="ativo">Ativos</option>
                <option value="desligado">Desligados</option>
              </select>
            </label>
            {Object.values(filtros).some(Boolean) && (
              <button type="button" className="botao-secundario" onClick={limpar}>Limpar</button>
            )}
          </div>
          <p className="resumo-filtro">{itens.length} colaborador(es){desligados ? ` · ${desligados} desligado(s)` : ''}</p>
          {!podeAlterar && (
            <p className="nota-filtro">Perfil Operador: inclui cadastros; para corrigir dados, use “Solicitar ajuste”.</p>
          )}
        </div>

        {carregando && itens.length === 0 ? (
          <p className="estado-vazio">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="estado-vazio">Nenhum colaborador encontrado.</p>
        ) : (
          <div className="tabela-area">
            <table className="tabela">
              <thead>
                <tr><th>Nome</th><th>Setor</th><th>E-mail</th><th>Projetos</th><th>Situação</th><th aria-label="Ações" /></tr>
              </thead>
              <tbody>
                {itens.map((c) => (
                  <tr key={c.id_colaborador} className={c.ativo ? '' : 'linha-inativa'}>
                    <td>{c.nome}{c.cargo && <span className="marca-alocado">{c.cargo}</span>}</td>
                    <td>{c.nome_setor}</td>
                    <td className="col-email">{c.email || <span className="vazio">—</span>}</td>
                    <td>{c.projetos || <span className="vazio">—</span>}</td>
                    <td>
                      <span className={`situacao situacao-${c.ativo ? 'ativo' : 'inativo'}`}>{c.ativo ? 'ativo' : 'desligado'}</span>
                      {!c.ativo && c.data_desligamento && <span className="texto-inativo">data efetiva {dataDaApi(c.data_desligamento)}</span>}
                    </td>
                    <td className="col-acoes col-acoes-varias">
                      {podeAlterar && <button type="button" className="botao-texto" onClick={() => abrir('form', c)}>Editar</button>}
                      {c.ativo && podeAlterar && (
                        <button type="button" className="botao-texto" onClick={() => abrir('desligar', c)}>Desligar</button>
                      )}
                      {!c.ativo && podeAlterar && (
                        <button type="button" className="botao-texto" onClick={() => acaoDeLinha({
                          confirmar: `Reativar ${c.nome}? As utilizações encerradas não voltam sozinhas.`,
                          acao: () => servico.reativar(c.id_colaborador), sucesso: `${c.nome} reativado.`,
                          mostrarMensagem, aoConcluir: recarregar
                        })}>Reativar</button>
                      )}
                      {pode('cadastro.excluir') && (
                        <button type="button" className="botao-texto botao-perigo" onClick={() => acaoDeLinha({
                          confirmar: `Excluir ${c.nome}? Só colaboradores sem vínculos podem ser excluídos.`,
                          acao: () => servico.excluir(c.id_colaborador), sucesso: `${c.nome} excluído.`,
                          mostrarMensagem, aoConcluir: recarregar
                        })}>Excluir</button>
                      )}
                      <BotaoSolicitarAjuste entidade="colaborador" idRegistro={c.id_colaborador} rotulo={`${c.nome} · ${c.nome_setor}`}
                        aoEmitida={(r) => mostrarMensagem('sucesso', `${r.codigo} enviada ao Administrador.`)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {painel?.tipo === 'form' && (
        <FormularioColaborador registro={painel.registro} setores={setores} controle={controle} aoSalvar={salvar} ehOperador={!podeAlterar} />
      )}
      {painel?.tipo === 'desligar' && <DialogoDesligamento registro={painel.registro} controle={controle} aoConfirmar={desligar} />}
    </>
  );
}
