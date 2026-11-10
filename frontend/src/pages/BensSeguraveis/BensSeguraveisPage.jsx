// Tela da RF_B6 - Gerenciar bens seguráveis (Protótipos 11, 11.1 e 11.2).
// Bens que podem ser cobertos por apólices, com campos comuns, específicos
// da categoria e opcionais (RN20). O bem não tem campo de projeto: as
// apólices que o cobrem e os projetos que as financiam aparecem na listagem
// e no painel, somente para leitura, inclusive quando há vários (RN40).
// Obrigatórios por categoria (ERS 2.7, RN20): placa do veículo, número de
// série do drone e do equipamento e endereço do imóvel; os demais dados são
// opcionais. Equipamentos (RF_B3) também são bens: aparecem aqui para serem
// segurados, mas a inativação segue pela tela deles.

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
import servico from '../../services/bemSeguravelService';
import { listarSetores } from '../../services/setorService';
import { dataDaApi, mascaraMoeda, moedaParaNumero, numeroParaMoeda, mascaraPlaca } from '../../utils/mascaras';

const FILTROS = { busca: '', categoria: '', situacao: '' };
const CATEGORIAS = { veiculo: 'Veículo', drone: 'Drone', imovel: 'Imóvel', equipamento: 'Equipamento', outro: 'Outro' };

// Identificação com o dado específico da categoria: "Toyota Hilux · QAB-1D23"
function identificacaoCompleta(b) {
  const especifico = b.placa || b.numero_serie || b.etiqueta_instituto || b.endereco;
  return especifico ? `${b.identificacao} · ${especifico}` : b.identificacao;
}

const AJUDA_CATEGORIA = {
  imovel: 'Imóvel não tem placa nem número de série: o endereço é obrigatório; matrícula, área e patrimônio são opcionais.',
  padrao: 'Comuns: categoria, identificação, valor, setor e situação. Obrigatórios da categoria: placa (veículo), número de série (drone e equipamento), endereço (imóvel). Opcionais: patrimônio e demais dados.'
};

function TabelaApolices({ apolices }) {
  if (apolices.length === 0) return <p className="bloco-pendente">Nenhuma apólice cobre este bem.</p>;
  return (
    <div className="tabela-interna">
      <table className="tabela tabela-compacta">
        <thead><tr><th>Apólice</th><th>Vigência</th><th>Projeto financiador</th></tr></thead>
        <tbody>
          {apolices.map((a) => (
            <tr key={`${a.id_apolice}-${a.vigencia}`}>
              <td>{a.numero} · {a.tipo_seguro}<span className="marca-alocado">{a.seguradora}</span></td>
              <td className="col-data">{dataDaApi(a.inicio)} – {dataDaApi(a.fim)}</td>
              <td>{a.projeto_codigo} {a.projeto_nome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormularioBem({ registro, setores, controle, aoSalvar, ehOperador }) {
  const [form, setForm] = useState(() => ({
    categoria: registro?.categoria || 'veiculo',
    identificacao: registro?.identificacao || '',
    placa: registro?.placa || '',
    numero_serie: registro?.numero_serie || '',
    endereco: registro?.endereco || '',
    renavam: registro?.renavam || '',
    ano_modelo: registro?.ano_modelo || '',
    matricula: registro?.matricula || '',
    area_construida_m2: registro?.area_construida_m2 ? String(registro.area_construida_m2).replace('.', ',') : '',
    patrimonio: registro?.patrimonio || '',
    valor: numeroParaMoeda(registro?.valor),
    id_setor: registro?.id_setor ? String(registro.id_setor) : ''
  }));
  const mudar = (campo, mascara) => (e) => setForm({ ...form, [campo]: mascara ? mascara(e.target.value) : e.target.value });
  const { erros, erroGeral, salvando, fechar } = controle;
  const comErro = (campo) => (erros[campo] ? 'com-erro' : '');
  const categoria = form.categoria;
  const travada = registro?.e_equipamento;

  function enviar() {
    aoSalvar({ ...form, valor: moedaParaNumero(form.valor), id_setor: form.id_setor || null });
  }

  return (
    <PainelLateral
      titulo={`${registro ? 'Editar bem' : 'Novo bem'} · ${CATEGORIAS[categoria]}`}
      subtitulo={registro ? `ID interno ${registro.id_bem}` : (ehOperador ? 'Inclusão pelo perfil Operador' : 'O ID interno é gerado pelo sistema ao salvar.')}
      aoFechar={fechar}
      aoEnviar={enviar}
      largo
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
      <Campo rotulo="Categoria *" erro={erros.categoria}
        dica={travada ? `Este bem é o equipamento ${registro.etiqueta_instituto}: etiqueta, tipo e responsável ficam no cadastro de Equipamentos.` : 'Os campos específicos mudam conforme a categoria.'}>
        <select value={categoria} onChange={mudar('categoria')} disabled={travada} className={comErro('categoria')}>
          {Object.entries(CATEGORIAS).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
        </select>
      </Campo>

      {categoria === 'veiculo' ? (
        <div className="dupla">
          <Campo rotulo="Identificação (modelo) *" erro={erros.identificacao}>
            <input type="text" value={form.identificacao} maxLength={120} onChange={mudar('identificacao')} className={comErro('identificacao')} autoFocus />
          </Campo>
          <Campo rotulo="Placa *" erro={erros.placa}>
            <input type="text" value={form.placa} placeholder="ABC-1D23" onChange={mudar('placa', mascaraPlaca)} className={comErro('placa')} />
          </Campo>
        </div>
      ) : (
        <Campo rotulo={categoria === 'imovel' ? 'Identificação *' : 'Identificação (modelo) *'} erro={erros.identificacao}>
          <input type="text" value={form.identificacao} maxLength={120} onChange={mudar('identificacao')} className={comErro('identificacao')} autoFocus />
        </Campo>
      )}

      {categoria === 'veiculo' && (
        <div className="dupla">
          <Campo rotulo="Renavam (opcional)" erro={erros.renavam}>
            <input type="text" inputMode="numeric" value={form.renavam} maxLength={11} onChange={mudar('renavam', (v) => v.replace(/\D/g, ''))} className={comErro('renavam')} />
          </Campo>
          <Campo rotulo="Ano/modelo (opcional)" erro={erros.ano_modelo}>
            <input type="text" value={form.ano_modelo} placeholder="2024/2025" maxLength={9} onChange={mudar('ano_modelo')} className={comErro('ano_modelo')} />
          </Campo>
        </div>
      )}
      {categoria === 'imovel' && (
        <>
          <Campo rotulo="Endereço *" erro={erros.endereco}>
            <input type="text" value={form.endereco} maxLength={200} onChange={mudar('endereco')} className={comErro('endereco')} />
          </Campo>
          <div className="dupla">
            <Campo rotulo="Matrícula do imóvel (opcional)" erro={erros.matricula}>
              <input type="text" value={form.matricula} maxLength={60} onChange={mudar('matricula')} className={comErro('matricula')} />
            </Campo>
            <Campo rotulo="Área construída em m² (opcional)" erro={erros.area_construida_m2}>
              <input type="text" inputMode="decimal" value={form.area_construida_m2} onChange={mudar('area_construida_m2')} className={comErro('area_construida_m2')} />
            </Campo>
          </div>
        </>
      )}

      <div className="dupla">
        {['drone', 'equipamento', 'outro'].includes(categoria) && (
          <Campo rotulo={categoria === 'outro' ? 'Número de série' : 'Número de série *'} erro={erros.numero_serie}>
            <input type="text" value={form.numero_serie} maxLength={60} onChange={mudar('numero_serie')} className={comErro('numero_serie')} />
          </Campo>
        )}
        <Campo rotulo="Patrimônio (opcional)" erro={erros.patrimonio}>
          <input type="text" value={form.patrimonio} maxLength={30} onChange={mudar('patrimonio')} className={comErro('patrimonio')} />
        </Campo>
        <Campo rotulo="Valor" erro={erros.valor}>
          <input type="text" inputMode="numeric" placeholder="0,00" value={form.valor} onChange={mudar('valor', mascaraMoeda)} className={comErro('valor')} />
        </Campo>
        <Campo rotulo="Setor" erro={erros.id_setor}>
          <select value={form.id_setor} onChange={mudar('id_setor')} className={comErro('id_setor')}>
            <option value="">Sem setor</option>
            {setores.map((s) => <option key={s.id_setor} value={s.id_setor}>{s.nome}</option>)}
          </select>
        </Campo>
      </div>

      {registro ? (
        <>
          <h3 className="titulo-secao-painel">Apólices e projetos <span className="pilula">somente leitura</span></h3>
          <TabelaApolices apolices={registro.apolices || []} />
          <p className="nota">O bem não tem campo de projeto: a relação vem das apólices que o cobrem (RN40).</p>
        </>
      ) : (
        <p className="aviso-info">{categoria === 'imovel' ? AJUDA_CATEGORIA.imovel : AJUDA_CATEGORIA.padrao}</p>
      )}
    </PainelLateral>
  );
}

export default function BensSeguraveisPage() {
  const { pode } = useAuth();
  const [mensagem, mostrarMensagem] = useMensagem(6000);
  const [setores, setSetores] = useState([]);
  const listar = useCallback((f) => servico.listar(f), []);
  const { itens, filtros, setFiltros, carregando, recarregar, limpar } =
    useListagem(listar, FILTROS, (texto) => mostrarMensagem('erro', texto));
  const controle = usePainelCadastro(mostrarMensagem, recarregar);
  const { painel, abrir, executar } = controle;
  const { idSolicitacao } = useAbrirPorLink(itens, 'id_bem', useCallback((b) => abrir('form', b), [abrir]));
  const podeAlterar = pode('cadastro.alterar');

  useEffect(() => {
    listarSetores().then(setSetores).catch(() => setSetores([]));
  }, []);

  function salvar(form) {
    const registro = painel.registro;
    executar(
      () => (registro ? servico.alterar(registro.id_bem, form) : servico.incluir(form)),
      (b) => `${CATEGORIAS[b.categoria]} ${b.identificacao} ${registro ? 'atualizado' : 'cadastrado'}.`
    );
  }

  const cobertos = itens.filter((b) => b.apolices.length > 0).length;

  return (
    <>
      <main className="conteudo">
        <div className="titulo-area">
          <div>
            <h2>Bens seguráveis</h2>
            <p className="subtitulo-pagina">Projetos aparecem por meio das apólices que cobrem cada bem.</p>
          </div>
          {pode('cadastro.incluir') && (
            <button type="button" className="botao-principal" onClick={() => abrir('form')}>Novo bem</button>
          )}
        </div>

        <FaixaCorrecao idSolicitacao={idSolicitacao} />
        <Mensagem mensagem={mensagem} />

        <div className="filtros">
          <div className="linha-filtros">
            <label className="campo campo-busca">
              <span>Identificação, placa ou série</span>
              <input type="search" placeholder="Pesquisar..." value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} />
            </label>
            <label className="campo">
              <span>Categoria</span>
              <select value={filtros.categoria} onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}>
                <option value="">Todas</option>
                {Object.entries(CATEGORIAS).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
              </select>
            </label>
            <label className="campo">
              <span>Situação</span>
              <select value={filtros.situacao} onChange={(e) => setFiltros({ ...filtros, situacao: e.target.value })}>
                <option value="">Todas</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </label>
            {Object.values(filtros).some(Boolean) && (
              <button type="button" className="botao-secundario" onClick={limpar}>Limpar</button>
            )}
          </div>
          <p className="resumo-filtro">{itens.length} bem(ns) · {cobertos} coberto(s) por apólice</p>
          {!podeAlterar && (
            <p className="nota-filtro">Perfil Operador: inclui e inativa bens; para corrigir dados, use “Solicitar ajuste”.</p>
          )}
        </div>

        {carregando && itens.length === 0 ? (
          <p className="estado-vazio">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="estado-vazio">Nenhum bem encontrado.</p>
        ) : (
          <div className="tabela-area">
            <table className="tabela">
              <thead>
                <tr><th>Categoria</th><th>Identificação</th><th>Apólices</th><th>Projetos</th><th>Setor</th><th>Valor</th><th>Situação</th><th aria-label="Ações" /></tr>
              </thead>
              <tbody>
                {itens.map((b) => (
                  <tr key={b.id_bem} className={b.situacao === 'ativo' ? '' : 'linha-inativa'}>
                    <td><span className={`etiqueta-categoria categoria-${b.categoria}`}>{CATEGORIAS[b.categoria]}</span></td>
                    <td>{identificacaoCompleta(b)}{b.patrimonio && <span className="marca-alocado">patrimônio {b.patrimonio}</span>}</td>
                    <td>
                      {b.apolices.length === 0 ? <span className="vazio">nenhuma</span> : (
                        <>
                          {b.apolices.length > 1 && <span className="pilula">{b.apolices.length}</span>}{' '}
                          {[...new Set(b.apolices.map((a) => a.numero))].join(', ')}
                        </>
                      )}
                    </td>
                    <td>{b.projetos.length ? b.projetos.map((p) => p.codigo).join(', ') : <span className="vazio">—</span>}</td>
                    <td>{b.nome_setor || <span className="vazio">—</span>}</td>
                    <td className="col-data">{b.valor !== null ? `R$ ${numeroParaMoeda(b.valor)}` : <span className="vazio">—</span>}</td>
                    <td>
                      <span className={`situacao situacao-${b.situacao}`}>{b.situacao}</span>
                      {b.situacao === 'inativo' && b.data_inativacao && <span className="texto-inativo">desde {dataDaApi(b.data_inativacao)}</span>}
                    </td>
                    <td className="col-acoes col-acoes-varias">
                      {podeAlterar && <button type="button" className="botao-texto" onClick={() => abrir('form', b)}>Editar</button>}
                      {b.e_equipamento ? (
                        <Link className="botao-texto" to={`/equipamentos?abrir=${b.id_bem}`}>Ver equipamento</Link>
                      ) : (
                        <>
                          {b.situacao === 'ativo' && pode('cadastro.inativar') && (
                            <button type="button" className="botao-texto" onClick={() => abrir('inativar', b)}>Inativar</button>
                          )}
                          {b.situacao === 'inativo' && podeAlterar && (
                            <button type="button" className="botao-texto" onClick={() => acaoDeLinha({
                              confirmar: `Reativar ${b.identificacao}?`, acao: () => servico.reativar(b.id_bem),
                              sucesso: `${b.identificacao} reativado.`, mostrarMensagem, aoConcluir: recarregar
                            })}>Reativar</button>
                          )}
                          <BotaoSolicitarAjuste entidade="bem" idRegistro={b.id_bem} rotulo={`${CATEGORIAS[b.categoria]} · ${identificacaoCompleta(b)}`}
                            aoEmitida={(r) => mostrarMensagem('sucesso', `${r.codigo} enviada ao Administrador.`)} />
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {painel?.tipo === 'form' && (
        <FormularioBem registro={painel.registro} setores={setores} controle={controle} aoSalvar={salvar} ehOperador={!podeAlterar} />
      )}
      {painel?.tipo === 'inativar' && (
        <DialogoInativacao
          titulo={`Inativar bem · ${CATEGORIAS[painel.registro.categoria]}`}
          subtitulo={`${identificacaoCompleta(painel.registro)} · ID ${painel.registro.id_bem}`}
          dicaData="Quando o bem deixou de ser usado. Não pode ser futura."
          detalhes={[['Setor', painel.registro.nome_setor], ['Apólices', [...new Set(painel.registro.apolices.map((a) => a.numero))].join(', ') || 'nenhuma']]}
          erros={controle.erros}
          salvando={controle.salvando}
          aoFechar={controle.fechar}
          aoConfirmar={(evento) => executar(() => servico.inativar(painel.registro.id_bem, evento), `${painel.registro.identificacao} inativado.`)}
        >
          {controle.erroGeral && <div className="mensagem mensagem-erro">{controle.erroGeral}</div>}
          {painel.registro.apolices.length > 0 && (
            <p className="aviso">
              <strong>O bem está coberto por apólice.</strong>
              As apólices e os itens segurados continuam como estão; a retirada do bem de uma apólice é feita na renovação.
            </p>
          )}
        </DialogoInativacao>
      )}
    </>
  );
}
