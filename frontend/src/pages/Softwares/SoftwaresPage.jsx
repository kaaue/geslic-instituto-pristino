// Tela da RF_B2 - Gerenciar softwares (Protótipo 5).
// Padrão dos cadastros: pesquisa e filtros acima, listagem e painel lateral
// à direita, aberto somente por Novo ou Editar. A listagem informa quantas
// licenças estão vinculadas a cada software; com licença, a exclusão é
// bloqueada e o caminho é inativar com data efetiva (RN22, RN37).
// Permissões (RN21): o Operador consulta, inclui e inativa; corrigir,
// reativar e excluir são do Administrador; o Operador pede correção por
// solicitação de ajuste (RF_B10).

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
import servico from '../../services/softwareService';

const FILTROS = { busca: '', situacao: '' };
const VAZIO = { nome: '', versao: '', fabricante: '', categoria: '', observacoes: '' };
const rotulo = (s) => (s.versao ? `${s.nome} ${s.versao}` : s.nome);

function FormularioSoftware({ registro, categorias, controle, aoSalvar }) {
  const [form, setForm] = useState(registro ? { ...VAZIO, ...registro } : VAZIO);
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  const { erros, erroGeral, salvando, fechar } = controle;
  const comErro = (campo) => (erros[campo] ? 'com-erro' : '');

  return (
    <PainelLateral
      titulo={registro ? 'Editar software' : 'Novo software'}
      subtitulo={registro ? `${rotulo(registro)} · ID ${registro.id_software}` : 'O ID é gerado pelo sistema ao salvar.'}
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
        <input type="text" value={form.nome} onChange={mudar('nome')} maxLength={80} className={comErro('nome')} autoFocus />
      </Campo>
      <div className="dupla">
        <Campo rotulo="Versão" erro={erros.versao}>
          <input type="text" value={form.versao || ''} onChange={mudar('versao')} maxLength={30} className={comErro('versao')} />
        </Campo>
        <Campo rotulo="Fabricante *" erro={erros.fabricante}>
          <input type="text" value={form.fabricante} onChange={mudar('fabricante')} maxLength={80} className={comErro('fabricante')} />
        </Campo>
      </div>
      <Campo rotulo="Categoria de uso" erro={erros.categoria} dica="Escolha uma já usada ou digite uma nova.">
        <input type="text" list="categorias-software" value={form.categoria || ''} onChange={mudar('categoria')} maxLength={40} className={comErro('categoria')} />
        <datalist id="categorias-software">
          {categorias.map((c) => <option key={c} value={c} />)}
        </datalist>
      </Campo>
      <Campo rotulo="Observações" erro={erros.observacoes}>
        <textarea value={form.observacoes || ''} onChange={mudar('observacoes')} maxLength={500} className={comErro('observacoes')} />
      </Campo>
      {registro?.licencas > 0 && (
        <p className="aviso">
          <strong>Exclusão bloqueada:</strong> este software tem {registro.licencas} licença(s) vinculada(s)
          ({registro.codigos_licencas}). Para retirá-lo das listas de novos cadastros, inative-o com data efetiva (RN22, RN37).
        </p>
      )}
    </PainelLateral>
  );
}

export default function SoftwaresPage() {
  const { pode } = useAuth();
  const [mensagem, mostrarMensagem] = useMensagem(6000);
  const [categorias, setCategorias] = useState([]);
  const listar = useCallback((f) => servico.listar(f), []);
  const { itens, filtros, setFiltros, carregando, recarregar, limpar } =
    useListagem(listar, FILTROS, (texto) => mostrarMensagem('erro', texto));
  const controle = usePainelCadastro(mostrarMensagem, recarregar);
  const { painel, abrir, executar } = controle;
  const { idSolicitacao } = useAbrirPorLink(itens, 'id_software', useCallback((s) => abrir('form', s), [abrir]));

  useEffect(() => {
    servico.categorias().then(setCategorias).catch(() => setCategorias([]));
  }, [itens]);

  const podeAlterar = pode('cadastro.alterar');
  const comLicencas = itens.filter((s) => s.licencas > 0).length;

  function salvar(form) {
    const registro = painel.registro;
    executar(
      () => (registro ? servico.alterar(registro.id_software, form) : servico.incluir(form)),
      (s) => `Software ${rotulo(s)} ${registro ? 'atualizado' : 'cadastrado'}.`
    );
  }

  return (
    <>
      <main className="conteudo">
        <div className="titulo-area">
          <div>
            <h2>Softwares</h2>
            <p className="subtitulo-pagina">O software descreve o produto; a licença registra a aquisição do direito de uso.</p>
          </div>
          {pode('cadastro.incluir') && (
            <button type="button" className="botao-principal" onClick={() => abrir('form')}>Novo software</button>
          )}
        </div>

        <FaixaCorrecao idSolicitacao={idSolicitacao} />
        <Mensagem mensagem={mensagem} />

        <div className="filtros">
          <div className="linha-filtros">
            <label className="campo campo-busca">
              <span>Nome ou fabricante</span>
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
          <p className="resumo-filtro">{itens.length} software(s) · {comLicencas} com licenças vinculadas</p>
          {!podeAlterar && (
            <p className="nota-filtro">Perfil Operador: inclui e inativa cadastros; para corrigir dados, use “Solicitar ajuste”.</p>
          )}
        </div>

        {carregando && itens.length === 0 ? (
          <p className="estado-vazio">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="estado-vazio">Nenhum software encontrado.</p>
        ) : (
          <div className="tabela-area">
            <table className="tabela">
              <thead>
                <tr><th>Software</th><th>Versão</th><th>Fabricante</th><th>Categoria</th><th>Licenças</th><th>Situação</th><th aria-label="Ações" /></tr>
              </thead>
              <tbody>
                {itens.map((s) => (
                  <tr key={s.id_software} className={s.ativo ? '' : 'linha-inativa'}>
                    <td>{s.nome}{s.observacoes && <span className="marca-alocado">{s.observacoes}</span>}</td>
                    <td>{s.versao || <span className="vazio">—</span>}</td>
                    <td>{s.fabricante}</td>
                    <td>{s.categoria || <span className="vazio">—</span>}</td>
                    <td>{s.licencas ? <span title={s.codigos_licencas}>{s.licencas}</span> : <span className="vazio">0</span>}</td>
                    <td><span className={`situacao situacao-${s.ativo ? 'ativo' : 'inativo'}`}>{s.ativo ? 'ativo' : 'inativo'}</span></td>
                    <td className="col-acoes col-acoes-varias">
                      {podeAlterar && <button type="button" className="botao-texto" onClick={() => abrir('form', s)}>Editar</button>}
                      {s.ativo && pode('cadastro.inativar') && (
                        <button type="button" className="botao-texto" onClick={() => abrir('inativar', s)}>Inativar</button>
                      )}
                      {!s.ativo && podeAlterar && (
                        <button type="button" className="botao-texto" onClick={() => acaoDeLinha({
                          confirmar: `Reativar o software ${rotulo(s)}?`, acao: () => servico.reativar(s.id_software),
                          sucesso: `Software ${rotulo(s)} reativado.`, mostrarMensagem, aoConcluir: recarregar
                        })}>Reativar</button>
                      )}
                      {pode('cadastro.excluir') && (
                        <button type="button" className="botao-texto botao-perigo" onClick={() => acaoDeLinha({
                          confirmar: `Excluir o software ${rotulo(s)}? Só cadastros sem licenças podem ser excluídos.`,
                          acao: () => servico.excluir(s.id_software), sucesso: `Software ${rotulo(s)} excluído.`,
                          mostrarMensagem, aoConcluir: recarregar
                        })}>Excluir</button>
                      )}
                      <BotaoSolicitarAjuste entidade="software" idRegistro={s.id_software} rotulo={rotulo(s)}
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
        <FormularioSoftware registro={painel.registro} categorias={categorias} controle={controle} aoSalvar={salvar} />
      )}
      {painel?.tipo === 'inativar' && (
        <DialogoInativacao
          titulo="Inativar software"
          subtitulo={`${rotulo(painel.registro)} · ID ${painel.registro.id_software}`}
          detalhes={[['Fabricante', painel.registro.fabricante], ['Licenças', painel.registro.codigos_licencas || 'nenhuma']]}
          erros={controle.erros}
          salvando={controle.salvando}
          aoFechar={controle.fechar}
          aoConfirmar={(evento) => executar(() => servico.inativar(painel.registro.id_software, evento),
            `Software ${rotulo(painel.registro)} inativado: não aparece mais nas listas de novos cadastros.`)}
        >
          {controle.erroGeral && <div className="mensagem mensagem-erro">{controle.erroGeral}</div>}
          <p className="aviso-info">O software inativo sai das listas de novos cadastros. As licenças já registradas continuam como estão.</p>
        </DialogoInativacao>
      )}
    </>
  );
}
