// Tela da RF_B7 - Gerenciar tipos de seguro e coberturas (Protótipo 12).
// Tipos de seguro com as coberturas de cada um e a quantidade de apólices
// que os utilizam. O painel lateral edita o tipo e as coberturas: cobertura
// já usada em apólice não é excluída, apenas inativada para novos registros
// (RN22). Permissões (RN21): o Operador consulta, inclui (tipos e coberturas)
// e inativa; corrigir, reativar e excluir são do Administrador.

import { useCallback, useState } from 'react';
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
import servico from '../../services/tipoSeguroService';
import { mensagemDeErro } from '../../services/api';

const FILTROS = { busca: '', situacao: '' };

// Linha de cobertura no painel: inativar (em uso), excluir (sem uso), reativar e renomear
function LinhaCobertura({ cobertura, pode, aoAgir }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(cobertura.descricao);
  return (
    <tr className={cobertura.ativo ? '' : 'linha-inativa'}>
      <td>
        {editando ? (
          <span className="novo-prazo">
            <input type="text" value={texto} maxLength={120} onChange={(e) => setTexto(e.target.value)} aria-label="Nova descrição" autoFocus />
            <button type="button" className="botao-texto" onClick={() => aoAgir('renomear', cobertura, texto).then((ok) => ok && setEditando(false))}>salvar</button>
            <button type="button" className="botao-texto" onClick={() => { setEditando(false); setTexto(cobertura.descricao); }}>cancelar</button>
          </span>
        ) : cobertura.descricao}
        {cobertura.em_uso && <span className="marca-alocado">usada em apólice</span>}
      </td>
      <td><span className={`situacao situacao-${cobertura.ativo ? 'ativo' : 'inativo'}`}>{cobertura.ativo ? 'ativa' : 'inativa'}</span></td>
      <td className="col-acoes col-acoes-varias">
        {!editando && pode('cadastro.alterar') && <button type="button" className="botao-texto" onClick={() => setEditando(true)}>Renomear</button>}
        {cobertura.ativo && pode('cadastro.inativar') && (cobertura.em_uso || !pode('cadastro.excluir')) && (
          <button type="button" className="botao-texto" onClick={() => aoAgir('inativar', cobertura)}>Inativar</button>
        )}
        {!cobertura.ativo && pode('cadastro.alterar') && <button type="button" className="botao-texto" onClick={() => aoAgir('reativar', cobertura)}>Reativar</button>}
        {!cobertura.em_uso && pode('cadastro.excluir') && (
          <button type="button" className="botao-texto botao-perigo" onClick={() => aoAgir('excluir', cobertura)}>Excluir</button>
        )}
      </td>
    </tr>
  );
}

function PainelTipo({ registro, controle, aoSalvar, aoMudouCobertura }) {
  const { pode } = useAuth();
  const [descricao, setDescricao] = useState(registro?.descricao || '');
  const [coberturas, setCoberturas] = useState(registro?.coberturas || []);
  const [novas, setNovas] = useState([]); // só na inclusão de um tipo novo
  const [nova, setNova] = useState('');
  const [erroCobertura, setErroCobertura] = useState('');
  const { erros, erroGeral, salvando, fechar } = controle;
  const podeAlterar = pode('cadastro.alterar');

  async function recarregarTipo() {
    const tipo = await servico.buscar(registro.id_tipo_seguro);
    setCoberturas(tipo.coberturas);
    aoMudouCobertura();
  }

  // Ações nas coberturas de um tipo existente valem na hora
  async function agir(acao, cobertura, texto) {
    setErroCobertura('');
    const operacoes = {
      inativar: () => servico.inativarCobertura(cobertura.id_cobertura),
      reativar: () => servico.reativarCobertura(cobertura.id_cobertura),
      excluir: () => servico.excluirCobertura(cobertura.id_cobertura),
      renomear: () => servico.alterarCobertura(cobertura.id_cobertura, texto)
    };
    if (acao === 'excluir' && !window.confirm(`Excluir a cobertura ${cobertura.descricao}?`)) return false;
    try {
      await operacoes[acao]();
      await recarregarTipo();
      return true;
    } catch (e) {
      setErroCobertura(e.corpo?.erros?.descricao || mensagemDeErro(e));
      return false;
    }
  }

  async function incluirCobertura() {
    const texto = nova.trim();
    if (!texto) return;
    setErroCobertura('');
    if (!registro) {
      if (novas.some((c) => c.toLowerCase() === texto.toLowerCase())) {
        setErroCobertura('Esta cobertura já está na lista.');
        return;
      }
      setNovas([...novas, texto]);
      setNova('');
      return;
    }
    try {
      await servico.incluirCobertura(registro.id_tipo_seguro, texto);
      setNova('');
      await recarregarTipo();
    } catch (e) {
      setErroCobertura(e.corpo?.erros?.descricao || mensagemDeErro(e));
    }
  }

  const podeSalvar = !registro || podeAlterar;
  return (
    <PainelLateral
      titulo={registro ? (podeAlterar ? 'Editar tipo de seguro' : 'Tipo de seguro e coberturas') : 'Novo tipo de seguro'}
      subtitulo={registro ? `${registro.descricao} · ID ${registro.id_tipo_seguro}` : 'O ID é gerado pelo sistema ao salvar.'}
      aoFechar={fechar}
      aoEnviar={podeSalvar ? () => aoSalvar(registro ? { descricao } : { descricao, coberturas: novas }) : undefined}
      largo
      rodape={(
        <>
          <button type="button" className="botao-secundario" onClick={fechar}>{podeSalvar ? 'Cancelar' : 'Fechar'}</button>
          {podeSalvar && (
            <button type="submit" className="botao-principal" disabled={salvando}>
              {salvando ? 'Salvando...' : registro ? 'Salvar alterações' : 'Salvar'}
            </button>
          )}
        </>
      )}
    >
      {erroGeral && <div className="mensagem mensagem-erro">{erroGeral}</div>}
      <Campo rotulo="Descrição do tipo *" erro={erros.descricao}>
        <input type="text" value={descricao} maxLength={80} onChange={(e) => setDescricao(e.target.value)}
          readOnly={!podeSalvar} className={erros.descricao ? 'com-erro' : ''} autoFocus={!registro} />
      </Campo>

      <div className="tabela-interna">
        <table className="tabela tabela-compacta">
          <thead><tr><th>Cobertura</th><th>Situação</th><th aria-label="Ações" /></tr></thead>
          <tbody>
            {registro && coberturas.map((c) => <LinhaCobertura key={c.id_cobertura} cobertura={c} pode={pode} aoAgir={agir} />)}
            {!registro && novas.map((c) => (
              <tr key={c}>
                <td>{c}</td>
                <td><span className="situacao situacao-ativo">nova</span></td>
                <td className="col-acoes"><button type="button" className="botao-texto botao-perigo" onClick={() => setNovas(novas.filter((x) => x !== c))}>Remover</button></td>
              </tr>
            ))}
            {(registro ? coberturas : novas).length === 0 && (
              <tr><td colSpan={3} className="vazio">Nenhuma cobertura ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {erroCobertura && <small className="erro">{erroCobertura}</small>}
      {erros.coberturas && <small className="erro">{erros.coberturas}</small>}

      {pode('cadastro.incluir') && (!registro || registro.ativo) && (
        <div className="linha-filtros">
          <label className="campo campo-busca">
            <span>Nova cobertura</span>
            <input type="text" value={nova} maxLength={120} onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); incluirCobertura(); } }} />
          </label>
          <button type="button" className="botao-secundario" onClick={incluirCobertura} disabled={!nova.trim()}>+ Nova cobertura</button>
        </div>
      )}
      <p className="aviso-info">
        Coberturas usadas em apólices não podem ser excluídas, apenas inativadas para novos registros.
        {registro && ' As ações nas coberturas valem na hora.'}
      </p>
    </PainelLateral>
  );
}

export default function TiposSeguroPage() {
  const { pode } = useAuth();
  const [mensagem, mostrarMensagem] = useMensagem(6000);
  const listar = useCallback((f) => servico.listar(f), []);
  const { itens, filtros, setFiltros, carregando, recarregar, limpar } =
    useListagem(listar, FILTROS, (texto) => mostrarMensagem('erro', texto));
  const controle = usePainelCadastro(mostrarMensagem, recarregar);
  const { painel, abrir, executar } = controle;
  const { idSolicitacao } = useAbrirPorLink(itens, 'id_tipo_seguro', useCallback((t) => abrir('form', t), [abrir]));
  const podeAlterar = pode('cadastro.alterar');

  function salvar(dados) {
    const registro = painel.registro;
    executar(
      () => (registro ? servico.alterar(registro.id_tipo_seguro, dados) : servico.incluir(dados)),
      (t) => `Tipo de seguro ${t.descricao} ${registro ? 'atualizado' : 'cadastrado'}.`
    );
  }

  return (
    <>
      <main className="conteudo">
        <div className="titulo-area">
          <div>
            <h2>Tipos de seguro e coberturas</h2>
            <p className="subtitulo-pagina">Oferecidos no registro e na renovação de apólices.</p>
          </div>
          {pode('cadastro.incluir') && (
            <button type="button" className="botao-principal" onClick={() => abrir('form')}>Novo tipo de seguro</button>
          )}
        </div>

        <FaixaCorrecao idSolicitacao={idSolicitacao} />
        <Mensagem mensagem={mensagem} />

        <div className="filtros">
          <div className="linha-filtros">
            <label className="campo campo-busca">
              <span>Tipo ou cobertura</span>
              <input type="search" placeholder="Pesquisar..." value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} />
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
          <p className="resumo-filtro">
            {itens.length} tipo(s) · {itens.reduce((t, x) => t + x.coberturas.length, 0)} cobertura(s)
          </p>
          {!podeAlterar && (
            <p className="nota-filtro">Perfil Operador: inclui tipos e coberturas e inativa; para corrigir dados, use “Solicitar ajuste”.</p>
          )}
        </div>

        {carregando && itens.length === 0 ? (
          <p className="estado-vazio">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="estado-vazio">Nenhum tipo de seguro encontrado.</p>
        ) : (
          <div className="tabela-area">
            <table className="tabela">
              <thead><tr><th>Tipo de seguro</th><th>Coberturas</th><th>Apólices</th><th>Situação</th><th aria-label="Ações" /></tr></thead>
              <tbody>
                {itens.map((t) => (
                  <tr key={t.id_tipo_seguro} className={t.ativo ? '' : 'linha-inativa'}>
                    <td>{t.descricao}</td>
                    <td className="col-recursos">
                      {t.coberturas.length === 0 ? <span className="vazio">nenhuma</span> : t.coberturas.map((c, i) => (
                        <span key={c.id_cobertura} style={c.ativo ? undefined : { textDecoration: 'line-through' }}
                          title={c.ativo ? undefined : 'inativa'}>{i > 0 && ' · '}{c.descricao}</span>
                      ))}
                    </td>
                    <td>{t.apolices || <span className="vazio">0</span>}</td>
                    <td><span className={`situacao situacao-${t.ativo ? 'ativo' : 'inativo'}`}>{t.ativo ? 'ativo' : 'inativo'}</span></td>
                    <td className="col-acoes col-acoes-varias">
                      <button type="button" className="botao-texto" onClick={() => abrir('form', t)}>{podeAlterar ? 'Editar' : 'Coberturas'}</button>
                      {t.ativo && pode('cadastro.inativar') && (
                        <button type="button" className="botao-texto" onClick={() => abrir('inativar', t)}>Inativar</button>
                      )}
                      {!t.ativo && podeAlterar && (
                        <button type="button" className="botao-texto" onClick={() => acaoDeLinha({
                          confirmar: `Reativar o tipo ${t.descricao}?`, acao: () => servico.reativar(t.id_tipo_seguro),
                          sucesso: `Tipo ${t.descricao} reativado.`, mostrarMensagem, aoConcluir: recarregar
                        })}>Reativar</button>
                      )}
                      {pode('cadastro.excluir') && (
                        <button type="button" className="botao-texto botao-perigo" onClick={() => acaoDeLinha({
                          confirmar: `Excluir o tipo ${t.descricao} e as coberturas dele? Só tipos sem uso em apólices podem ser excluídos.`,
                          acao: () => servico.excluir(t.id_tipo_seguro), sucesso: `Tipo ${t.descricao} excluído.`,
                          mostrarMensagem, aoConcluir: recarregar
                        })}>Excluir</button>
                      )}
                      <BotaoSolicitarAjuste entidade="tipo_seguro" idRegistro={t.id_tipo_seguro} rotulo={t.descricao}
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
        <PainelTipo registro={painel.registro} controle={controle} aoSalvar={salvar} aoMudouCobertura={recarregar} />
      )}
      {painel?.tipo === 'inativar' && (
        <DialogoInativacao
          titulo="Inativar tipo de seguro"
          subtitulo={`${painel.registro.descricao} · ID ${painel.registro.id_tipo_seguro}`}
          detalhes={[['Apólices', String(painel.registro.apolices)], ['Coberturas', painel.registro.coberturas.map((c) => c.descricao).join(', ')]]}
          erros={controle.erros}
          salvando={controle.salvando}
          aoFechar={controle.fechar}
          aoConfirmar={(evento) => executar(() => servico.inativar(painel.registro.id_tipo_seguro, evento),
            `Tipo ${painel.registro.descricao} inativado: não aparece mais nos novos registros de apólice.`)}
        >
          {controle.erroGeral && <div className="mensagem mensagem-erro">{controle.erroGeral}</div>}
        </DialogoInativacao>
      )}
    </>
  );
}
