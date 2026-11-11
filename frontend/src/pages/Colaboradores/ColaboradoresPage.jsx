// Tela da RF_B4 - Gerenciar colaboradores (Protótipo 8).
// Cadastro mínimo das pessoas do Instituto; não cria conta de acesso.
// Nome igual a outro gera aviso de possível homônimo e permite continuar; o
// e-mail repetido é bloqueado (RN19). O Operador inclui e, para corrigir
// dados, usa "Solicitar ajuste"; corrigir, desligar e reativar são
// do Administrador. O desligamento exige data efetiva (RN37), encerra as
// utilizações e deixa as instâncias ativas e vagas (RN07); o colaborador
// desligado aparece esmaecido, com a data. A participação em projetos é
// mostrada aqui; na edição, o Administrador marca os projetos de que a
// pessoa participa (o mesmo efeito de alterar os participantes no projeto).
// O colaborador pode estar em mais de um setor (ao menos um). Cada linha da
// tabela abre, ao ser clicada, os projetos de que a pessoa participa, com
// acesso ao cadastro de cada projeto.

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useMensagem from '../../hooks/useMensagem';
import useListagem from '../../hooks/useListagem';
import useAbrirPorLink from '../../hooks/useAbrirPorLink';
import usePainelCadastro, { acaoDeLinha } from '../../hooks/usePainelCadastro';
import Mensagem from '../../components/common/Mensagem.jsx';
import Campo from '../../components/common/Campo.jsx';
import PainelLateral from '../../components/common/PainelLateral.jsx';
import SeletorSetores from '../../components/common/SeletorSetores.jsx';
import DialogoInativacao from '../../components/common/DialogoInativacao.jsx';
import BotaoSolicitarAjuste from '../../components/solicitacoes/BotaoSolicitarAjuste.jsx';
import FaixaCorrecao from '../../components/solicitacoes/FaixaCorrecao.jsx';
import { colaboradorCadastro as servico } from '../../services/colaboradorService';
import { listarSetores } from '../../services/setorService';
import { listarProjetos } from '../../services/projetoService';
import { dataDaApi } from '../../utils/mascaras';

const FILTROS = { busca: '', id_setor: '', projeto: '', situacao: '' };

const ROTULO_SITUACAO_PROJETO = { em_andamento: 'em andamento', encerrado: 'encerrado' };

function FormularioColaborador({ registro, setores, controle, aoSalvar, ehOperador }) {
  const [form, setForm] = useState({
    nome: registro?.nome || '', ids_setores: registro?.ids_setores ? [...registro.ids_setores] : [],
    cargo: registro?.cargo || '', email: registro?.email || '',
    ...(registro && { ids_projetos: (registro.participacoes || []).map((p) => p.id_projeto) })
  });
  const [homonimos, setHomonimos] = useState([]);
  const [projetos, setProjetos] = useState(null);
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

  // Todos os projetos, para marcar aqueles de que a pessoa participa
  useEffect(() => {
    if (registro) listarProjetos({}).then(setProjetos).catch(() => setProjetos([]));
  }, [registro]);
  const alternarProjeto = (id) => setForm((atual) => ({
    ...atual,
    ids_projetos: atual.ids_projetos.includes(id) ? atual.ids_projetos.filter((x) => x !== id) : [...atual.ids_projetos, id]
  }));

  // Os setores atuais continuam na lista, mesmo que tenham sido inativados
  const opcoesSetor = [...setores];
  const nomesAtuais = (registro?.nome_setor || '').split(', ');
  (registro?.ids_setores || []).forEach((id, i) => {
    if (!opcoesSetor.some((s) => s.id_setor === id)) opcoesSetor.push({ id_setor: id, nome: `${nomesAtuais[i] || `Setor ${id}`} (inativo)` });
  });

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
      <Campo rotulo="Cargo" erro={erros.cargo}>
        <input type="text" value={form.cargo} maxLength={80} onChange={mudar('cargo')} className={comErro('cargo')} />
      </Campo>
      <SeletorSetores setores={opcoesSetor} selecionados={form.ids_setores} erro={erros.ids_setores}
        aoMudar={(ids) => setForm((atual) => ({ ...atual, ids_setores: ids }))} />
      <Campo rotulo="E-mail" erro={erros.email}>
        <input type="email" value={form.email} maxLength={120} onChange={mudar('email')} className={comErro('email')} />
      </Campo>
      {registro && (
        <fieldset className="campo campo-setores">
          <legend>Projetos de que participa{form.ids_projetos.length > 0 && ` (${form.ids_projetos.length})`}</legend>
          {projetos === null ? <p className="bloco-pendente">Carregando...</p> : projetos.length === 0 ? (
            <p className="bloco-pendente">Nenhum projeto cadastrado.</p>
          ) : (
            <ul className={`lista-marcavel${erros.ids_projetos ? ' com-erro' : ''}`}>
              {projetos.map((p) => {
                const marcado = form.ids_projetos.includes(p.id_projeto);
                const responsavel = p.id_responsavel === registro.id_colaborador;
                // Desligado não entra em projeto novo; o responsável não sai do seu
                const travado = (responsavel && marcado) || (!registro.ativo && !marcado);
                return (
                  <li key={p.id_projeto}>
                    <label>
                      <input type="checkbox" checked={marcado} disabled={travado} onChange={() => alternarProjeto(p.id_projeto)} />
                      <span>
                        {p.codigo} · {p.nome}
                        {(responsavel || p.situacao === 'encerrado') && (
                          <small>{[responsavel && 'responsável pelo projeto', p.situacao === 'encerrado' && 'encerrado'].filter(Boolean).join(' · ')}</small>
                        )}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {erros.ids_projetos ? <small className="erro">{erros.ids_projetos}</small> : (
            <small className="dica">
              {registro.ativo
                ? 'Marque ou desmarque para incluir ou retirar a pessoa dos projetos. O responsável por um projeto só sai dele depois da troca de responsável, no cadastro do projeto.'
                : 'Colaborador desligado: pode ser retirado dos projetos, mas não incluído em outros.'}
            </small>
          )}
        </fieldset>
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
          Desative a conta em Gerenciar usuários, se for o caso.
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
  // Linhas abertas, com os projetos do colaborador
  const [abertos, setAbertos] = useState([]);
  const alternarLinha = (id) => setAbertos((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

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
              <span>Projeto</span>
              <input type="search" placeholder="Nome ou código" value={filtros.projeto}
                onChange={(e) => setFiltros({ ...filtros, projeto: e.target.value })} />
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
                <tr><th>Nome</th><th>Setor</th><th>E-mail</th><th>Situação</th><th aria-label="Ações" /></tr>
              </thead>
              <tbody>
                {itens.map((c) => {
                  const aberto = abertos.includes(c.id_colaborador);
                  const idDetalhe = `projetos-colaborador-${c.id_colaborador}`;
                  return (
                  <Fragment key={c.id_colaborador}>
                  <tr className={`linha-expansivel${aberto ? ' linha-aberta' : ''}${c.ativo ? '' : ' linha-inativa'}`}
                    onClick={() => alternarLinha(c.id_colaborador)}>
                    <td>
                      <button type="button" className="botao-expandir" aria-expanded={aberto} aria-controls={idDetalhe}
                        title={aberto ? 'Ocultar projetos' : 'Ver projetos'}
                        onClick={(e) => { e.stopPropagation(); alternarLinha(c.id_colaborador); }}>
                        <span className="seta-expandir" aria-hidden="true" />
                        <span className="nome-expandir">{c.nome}</span>
                      </button>
                      {c.cargo && <span className="marca-alocado marca-recuada">{c.cargo}</span>}
                    </td>
                    <td>{c.nome_setor}</td>
                    <td className="col-email">{c.email || <span className="vazio">—</span>}</td>
                    <td>
                      <span className={`situacao situacao-${c.ativo ? 'ativo' : 'inativo'}`}>{c.ativo ? 'ativo' : 'desligado'}</span>
                      {!c.ativo && c.data_desligamento && <span className="texto-inativo">data efetiva {dataDaApi(c.data_desligamento)}</span>}
                    </td>
                    <td className="col-acoes col-acoes-varias" onClick={(e) => e.stopPropagation()}>
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
                      <BotaoSolicitarAjuste entidade="colaborador" idRegistro={c.id_colaborador} rotulo={`${c.nome} · ${c.nome_setor}`}
                        aoEmitida={(r) => mostrarMensagem('sucesso', `${r.codigo} enviada ao Administrador.`)} />
                    </td>
                  </tr>
                  {aberto && (
                    <tr className="linha-detalhe" id={idDetalhe}>
                      <td colSpan={5}>
                        {c.participacoes.length === 0 ? (
                          <p className="detalhe-vazio">{c.nome} não participa de nenhum projeto.</p>
                        ) : (
                          <ul className="lista-projetos-colaborador" aria-label={`Projetos de ${c.nome}`}>
                            {c.participacoes.map((p) => (
                              <li key={p.id_projeto}>
                                <span className="col-etiqueta">{p.codigo}</span>
                                <span className="nome-projeto">{p.nome}</span>
                                <span className={`situacao ${p.situacao === 'em_andamento' ? 'situacao-ativo' : 'situacao-inativo'}`}>
                                  {ROTULO_SITUACAO_PROJETO[p.situacao] || p.situacao}
                                </span>
                                <Link className="botao-texto" to={`/projetos?abrir=${p.id_projeto}`}>Abrir projeto</Link>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="nota">
                          {podeAlterar
                            ? 'Para incluir ou retirar projetos, use Editar (ou o cadastro de cada projeto).'
                            : 'Incluir ou retirar a pessoa de um projeto é do Administrador: use “Solicitar ajuste”.'}
                        </p>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
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
