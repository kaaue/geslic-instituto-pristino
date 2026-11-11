// Tela da RF_B1 - Gerenciar fornecedores e seguradoras (Protótipo 6).
// Empresas com as quais o Instituto contrata licenças (fornecedor de
// software) e seguros (seguradora). CNPJ único. Com licenças ou apólices
// vinculadas, o cadastro não é excluído, apenas inativado (RN22).
// Permissões (RN21): o Operador consulta, inclui e inativa; corrigir e
// reativar são do Administrador.

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
import servico from '../../services/fornecedorService';
import { mascaraCnpj, mascaraTelefone } from '../../utils/mascaras';

const FILTROS = { busca: '', tipo: '', situacao: '' };
const VAZIO = { tipo: 'software', razao_social: '', nome_fantasia: '', cnpj: '', contato: '', telefone: '', email: '' };
const ROTULO_TIPO = { software: 'Fornecedor de software', seguradora: 'Seguradora' };
const nome = (f) => f.nome_fantasia || f.razao_social;

function vinculos(f) {
  const partes = [];
  if (f.licencas) partes.push(`${f.licencas} licença${f.licencas > 1 ? 's' : ''}`);
  if (f.apolices) partes.push(`${f.apolices} apólice${f.apolices > 1 ? 's' : ''}`);
  return partes.join(' e ');
}

function FormularioFornecedor({ registro, controle, aoSalvar, tipoPadrao = 'software' }) {
  const [form, setForm] = useState(registro
    ? { ...VAZIO, ...registro, cnpj: mascaraCnpj(registro.cnpj), telefone: registro.telefone || '' }
    : { ...VAZIO, tipo: tipoPadrao });
  const mudar = (campo, mascara) => (e) => setForm({ ...form, [campo]: mascara ? mascara(e.target.value) : e.target.value });
  const { erros, erroGeral, salvando, fechar } = controle;
  const comErro = (campo) => (erros[campo] ? 'com-erro' : '');

  return (
    <PainelLateral
      titulo={registro ? 'Editar cadastro' : 'Novo fornecedor ou seguradora'}
      subtitulo={registro ? `${nome(registro)} · ID ${registro.id_fornecedor}` : 'O ID é gerado pelo sistema ao salvar.'}
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
      <Campo rotulo="Tipo *" erro={erros.tipo}>
        <div className={`segmentado ${comErro('tipo')}`} role="group" aria-label="Tipo">
          {Object.entries(ROTULO_TIPO).map(([valor, texto]) => (
            <button key={valor} type="button" aria-pressed={form.tipo === valor} onClick={() => setForm({ ...form, tipo: valor })}>
              {texto}
            </button>
          ))}
        </div>
      </Campo>
      <Campo rotulo="Razão social *" erro={erros.razao_social}>
        <input type="text" value={form.razao_social} maxLength={120} onChange={mudar('razao_social')} className={comErro('razao_social')} autoFocus />
      </Campo>
      <div className="dupla">
        <Campo rotulo="Nome fantasia" erro={erros.nome_fantasia}>
          <input type="text" value={form.nome_fantasia || ''} maxLength={120} onChange={mudar('nome_fantasia')} className={comErro('nome_fantasia')} />
        </Campo>
        <Campo rotulo="CNPJ *" erro={erros.cnpj}>
          <input type="text" inputMode="numeric" placeholder="00.000.000/0000-00" value={form.cnpj}
            onChange={mudar('cnpj', mascaraCnpj)} className={comErro('cnpj')} />
        </Campo>
      </div>
      <div className="dupla">
        <Campo rotulo="Contato" erro={erros.contato}>
          <input type="text" value={form.contato || ''} maxLength={80} onChange={mudar('contato')} className={comErro('contato')} />
        </Campo>
        <Campo rotulo="Telefone" erro={erros.telefone}>
          <input type="text" inputMode="tel" placeholder="(00) 0000-0000" value={form.telefone}
            onChange={mudar('telefone', mascaraTelefone)} className={comErro('telefone')} />
        </Campo>
      </div>
      <Campo rotulo="E-mail" erro={erros.email}>
        <input type="email" value={form.email || ''} maxLength={120} onChange={mudar('email')} className={comErro('email')} />
      </Campo>
      {registro && vinculos(registro) && (
        <p className="aviso-info">Este cadastro tem {vinculos(registro)} vinculada(s). Para tirá-lo das listas de novos registros, inative-o; cadastros não são excluídos (RN22).</p>
      )}
    </PainelLateral>
  );
}

// Menu: "Fornecedores" e "Seguradoras" são o mesmo cadastro (RF_B1), cada
// item já filtrado pelo seu tipo. O tipo continua editável no formulário.
export function SeguradorasPage() {
  return <FornecedoresPage tipoFixo="seguradora" />;
}

const TITULO_TIPO = { software: 'Fornecedores', seguradora: 'Seguradoras' };

export default function FornecedoresPage({ tipoFixo = 'software' }) {
  const { pode } = useAuth();
  const [mensagem, mostrarMensagem] = useMensagem(6000);
  const listar = useCallback((f) => servico.listar({ ...f, tipo: tipoFixo }), [tipoFixo]);
  const { itens, filtros, setFiltros, carregando, recarregar, limpar } =
    useListagem(listar, FILTROS, (texto) => mostrarMensagem('erro', texto));
  const controle = usePainelCadastro(mostrarMensagem, recarregar);
  const { painel, abrir, executar } = controle;
  const { idSolicitacao } = useAbrirPorLink(itens, 'id_fornecedor', useCallback((f) => abrir('form', f), [abrir]));
  const podeAlterar = pode('cadastro.alterar');

  function salvar(form) {
    const registro = painel.registro;
    executar(
      () => (registro ? servico.alterar(registro.id_fornecedor, form) : servico.incluir(form)),
      (f) => `${nome(f)} ${registro ? 'atualizado' : 'cadastrado'}.`
    );
  }

  return (
    <>
      <main className="conteudo">
        <div className="titulo-area">
          <div>
            <h2>{TITULO_TIPO[tipoFixo]}</h2>
            <p className="subtitulo-pagina">{tipoFixo === 'seguradora' ? 'Seguradoras com as quais o Instituto contrata apólices.' : 'Empresas das quais o Instituto adquire licenças de software.'} CNPJ único; inativação em vez de exclusão.</p>
          </div>
          {pode('cadastro.incluir') && (
            <button type="button" className="botao-principal" onClick={() => abrir('form')}>Novo cadastro</button>
          )}
        </div>

        <FaixaCorrecao idSolicitacao={idSolicitacao} />
        <Mensagem mensagem={mensagem} />

        <div className="filtros">
          <div className="linha-filtros">
            <label className="campo campo-busca">
              <span>Razão social, nome fantasia ou CNPJ</span>
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
            {itens.length} {tipoFixo === 'seguradora' ? 'seguradora(s)' : 'fornecedor(es) de software'}
          </p>
          {!podeAlterar && (
            <p className="nota-filtro">Perfil Operador: inclui e inativa cadastros; para corrigir dados, use “Solicitar ajuste”.</p>
          )}
        </div>

        {carregando && itens.length === 0 ? (
          <p className="estado-vazio">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="estado-vazio">Nenhum cadastro encontrado.</p>
        ) : (
          <div className="tabela-area">
            <table className="tabela">
              <thead>
                <tr><th>Razão social</th><th>CNPJ</th><th>Tipo</th><th>Contato</th><th>Vínculos</th><th>Situação</th><th aria-label="Ações" /></tr>
              </thead>
              <tbody>
                {itens.map((f) => (
                  <tr key={f.id_fornecedor} className={f.ativo ? '' : 'linha-inativa'}>
                    <td>{f.razao_social}{f.nome_fantasia && <span className="marca-alocado">{f.nome_fantasia}</span>}</td>
                    <td className="col-data">{mascaraCnpj(f.cnpj)}</td>
                    <td><span className={`etiqueta-categoria ${f.tipo === 'seguradora' ? 'categoria-veiculo' : 'categoria-equipamento'}`}>
                      {f.tipo === 'seguradora' ? 'Seguradora' : 'Software'}</span></td>
                    <td className="col-recursos">
                      {f.contato || '—'}
                      {(f.telefone || f.email) && <span className="marca-alocado">{[f.telefone, f.email].filter(Boolean).join(' · ')}</span>}
                    </td>
                    <td>{vinculos(f) || <span className="vazio">nenhum</span>}</td>
                    <td><span className={`situacao situacao-${f.ativo ? 'ativo' : 'inativo'}`}>{f.ativo ? 'ativo' : 'inativo'}</span></td>
                    <td className="col-acoes col-acoes-varias">
                      {podeAlterar && <button type="button" className="botao-texto" onClick={() => abrir('form', f)}>Editar</button>}
                      {f.ativo && pode('cadastro.inativar') && (
                        <button type="button" className="botao-texto" onClick={() => abrir('inativar', f)}>Inativar</button>
                      )}
                      {!f.ativo && podeAlterar && (
                        <button type="button" className="botao-texto" onClick={() => acaoDeLinha({
                          confirmar: `Reativar ${nome(f)}?`, acao: () => servico.reativar(f.id_fornecedor),
                          sucesso: `${nome(f)} reativado.`, mostrarMensagem, aoConcluir: recarregar
                        })}>Reativar</button>
                      )}
                      <BotaoSolicitarAjuste entidade="fornecedor" idRegistro={f.id_fornecedor} rotulo={nome(f)}
                        aoEmitida={(r) => mostrarMensagem('sucesso', `${r.codigo} enviada ao Administrador.`)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {painel?.tipo === 'form' && <FormularioFornecedor registro={painel.registro} controle={controle} aoSalvar={salvar} tipoPadrao={tipoFixo} />}
      {painel?.tipo === 'inativar' && (
        <DialogoInativacao
          titulo={`Inativar ${painel.registro.tipo === 'seguradora' ? 'seguradora' : 'fornecedor'}`}
          subtitulo={`${painel.registro.razao_social} · ID ${painel.registro.id_fornecedor}`}
          detalhes={[['CNPJ', mascaraCnpj(painel.registro.cnpj)], ['Vínculos', vinculos(painel.registro) || 'nenhum']]}
          erros={controle.erros}
          salvando={controle.salvando}
          aoFechar={controle.fechar}
          aoConfirmar={(evento) => executar(() => servico.inativar(painel.registro.id_fornecedor, evento),
            `${nome(painel.registro)} inativado: não aparece mais nas listas de novos cadastros.`)}
        >
          {controle.erroGeral && <div className="mensagem mensagem-erro">{controle.erroGeral}</div>}
          <p className="aviso-info">O cadastro inativo sai das listas de novos registros. Licenças e apólices já registradas continuam como estão.</p>
        </DialogoInativacao>
      )}
    </>
  );
}
