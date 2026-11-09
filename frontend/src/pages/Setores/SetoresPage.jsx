// Tela da RF_B5 - Gerenciar setores (Protótipo 9).
// Lista pré-cadastrada, com inclusão de novos setores. Mostra o coordenador
// (colaborador ativo) e a quantidade de colaboradores, equipamentos e bens
// de cada setor. A inativação exige data efetiva, exibida no setor inativo
// (RN37); setores com vínculos não podem ser excluídos (RN22).
// Permissões (RN21): o Operador consulta, inclui e inativa; corrigir
// (inclusive a situação), reativar e excluir são do Administrador.

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
import { setorCadastro as servico } from '../../services/setorService';
import { listarColaboradores } from '../../services/colaboradorService';
import { hojeLocal } from '../../services/api';
import { dataDaApi } from '../../utils/mascaras';

const FILTROS = { busca: '', situacao: '' };

function FormularioSetor({ registro, colaboradores, controle, aoSalvar }) {
  const [form, setForm] = useState({
    nome: registro?.nome || '',
    id_coordenador: registro?.id_coordenador ? String(registro.id_coordenador) : '',
    situacao: registro ? (registro.ativo ? 'ativo' : 'inativo') : 'ativo',
    data_efetiva: hojeLocal(),
    motivo: ''
  });
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  const { erros, erroGeral, salvando, fechar } = controle;
  const inativando = registro?.ativo && form.situacao === 'inativo';

  // O coordenador atual continua na lista, mesmo que não esteja mais entre os ativos
  const opcoes = [...colaboradores];
  if (registro?.id_coordenador && !opcoes.some((c) => c.id_colaborador === registro.id_coordenador)) {
    opcoes.unshift({ id_colaborador: registro.id_coordenador, nome: registro.nome_coordenador });
  }

  return (
    <PainelLateral
      titulo={registro ? 'Editar setor' : 'Novo setor'}
      subtitulo={registro ? `${registro.nome} · ID ${registro.id_setor}` : 'O ID é gerado pelo sistema ao salvar.'}
      aoFechar={fechar}
      aoEnviar={() => aoSalvar({ ...form, id_coordenador: form.id_coordenador || null })}
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
      <Campo rotulo="Nome do setor *" erro={erros.nome}>
        <input type="text" value={form.nome} maxLength={80} onChange={mudar('nome')} className={erros.nome ? 'com-erro' : ''} autoFocus />
      </Campo>
      <Campo rotulo="Coordenador" erro={erros.id_coordenador} dica="Colaborador ativo que coordena o setor.">
        <select value={form.id_coordenador} onChange={mudar('id_coordenador')} className={erros.id_coordenador ? 'com-erro' : ''}>
          <option value="">Sem coordenador</option>
          {opcoes.map((c) => <option key={c.id_colaborador} value={c.id_colaborador}>{c.nome}</option>)}
        </select>
      </Campo>
      {registro && (
        <Campo rotulo="Situação">
          <select value={form.situacao} onChange={mudar('situacao')}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </Campo>
      )}
      {inativando && (
        <div className="dupla">
          <Campo rotulo="Data efetiva da inativação *" erro={erros.data_efetiva}>
            <input type="date" value={form.data_efetiva} max={hojeLocal()} onChange={mudar('data_efetiva')}
              className={erros.data_efetiva ? 'com-erro' : ''} />
          </Campo>
          <Campo rotulo="Motivo (opcional)" erro={erros.motivo}>
            <input type="text" value={form.motivo} maxLength={255} onChange={mudar('motivo')} />
          </Campo>
        </div>
      )}
      <p className="aviso-info">
        Inativar exige data efetiva; o registro guarda também a data e a hora da operação (RN37). Com colaboradores,
        equipamentos e bens vinculados, o setor não pode ser excluído (RN22).
      </p>
    </PainelLateral>
  );
}

export default function SetoresPage() {
  const { pode } = useAuth();
  const [mensagem, mostrarMensagem] = useMensagem(6000);
  const [colaboradores, setColaboradores] = useState([]);
  const listar = useCallback((f) => servico.listar(f), []);
  const { itens, filtros, setFiltros, carregando, recarregar, limpar } =
    useListagem(listar, FILTROS, (texto) => mostrarMensagem('erro', texto));
  const controle = usePainelCadastro(mostrarMensagem, recarregar);
  const { painel, abrir, executar } = controle;
  const { idSolicitacao } = useAbrirPorLink(itens, 'id_setor', useCallback((s) => abrir('form', s), [abrir]));
  const podeAlterar = pode('cadastro.alterar');

  useEffect(() => {
    listarColaboradores().then(setColaboradores).catch(() => setColaboradores([]));
  }, []);

  function salvar(form) {
    const registro = painel.registro;
    executar(
      () => (registro ? servico.alterar(registro.id_setor, form) : servico.incluir(form)),
      (s) => `Setor ${s.nome} ${registro ? 'atualizado' : 'cadastrado'}.`
    );
  }

  return (
    <>
      <main className="conteudo">
        <div className="titulo-area">
          <div>
            <h2>Setores</h2>
            <p className="subtitulo-pagina">Lista pré-cadastrada, com inclusão de novos setores.</p>
          </div>
          {pode('cadastro.incluir') && (
            <button type="button" className="botao-principal" onClick={() => abrir('form')}>Novo setor</button>
          )}
        </div>

        <FaixaCorrecao idSolicitacao={idSolicitacao} />
        <Mensagem mensagem={mensagem} />

        <div className="filtros">
          <div className="linha-filtros">
            <label className="campo campo-busca">
              <span>Nome do setor ou coordenador</span>
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
          <p className="resumo-filtro">{itens.length} setor(es) · {itens.filter((s) => s.ativo).length} ativo(s)</p>
          {!podeAlterar && (
            <p className="nota-filtro">Perfil Operador: inclui e inativa setores; para corrigir dados, use “Solicitar ajuste”.</p>
          )}
        </div>

        {carregando && itens.length === 0 ? (
          <p className="estado-vazio">Carregando...</p>
        ) : itens.length === 0 ? (
          <p className="estado-vazio">Nenhum setor encontrado.</p>
        ) : (
          <div className="tabela-area">
            <table className="tabela">
              <thead>
                <tr><th>Setor</th><th>Coordenador</th><th>Colaboradores</th><th>Equipamentos</th><th>Bens</th><th>Situação</th><th aria-label="Ações" /></tr>
              </thead>
              <tbody>
                {itens.map((s) => (
                  <tr key={s.id_setor} className={s.ativo ? '' : 'linha-inativa'}>
                    <td>{s.nome}</td>
                    <td>{s.nome_coordenador || <span className="vazio">—</span>}</td>
                    <td>{s.colaboradores}</td>
                    <td>{s.equipamentos}</td>
                    <td>{s.bens}</td>
                    <td>
                      <span className={`situacao situacao-${s.ativo ? 'ativo' : 'inativo'}`}>{s.ativo ? 'ativo' : 'inativo'}</span>
                      {!s.ativo && s.data_inativacao && <span className="texto-inativo">desde {dataDaApi(s.data_inativacao)}</span>}
                    </td>
                    <td className="col-acoes col-acoes-varias">
                      {podeAlterar && <button type="button" className="botao-texto" onClick={() => abrir('form', s)}>Editar</button>}
                      {s.ativo && pode('cadastro.inativar') && (
                        <button type="button" className="botao-texto" onClick={() => abrir('inativar', s)}>Inativar</button>
                      )}
                      {!s.ativo && podeAlterar && (
                        <button type="button" className="botao-texto" onClick={() => acaoDeLinha({
                          confirmar: `Reativar o setor ${s.nome}?`, acao: () => servico.reativar(s.id_setor),
                          sucesso: `Setor ${s.nome} reativado.`, mostrarMensagem, aoConcluir: recarregar
                        })}>Reativar</button>
                      )}
                      {pode('cadastro.excluir') && (
                        <button type="button" className="botao-texto botao-perigo" onClick={() => acaoDeLinha({
                          confirmar: `Excluir o setor ${s.nome}? Só setores sem vínculos podem ser excluídos.`,
                          acao: () => servico.excluir(s.id_setor), sucesso: `Setor ${s.nome} excluído.`,
                          mostrarMensagem, aoConcluir: recarregar
                        })}>Excluir</button>
                      )}
                      <BotaoSolicitarAjuste entidade="setor" idRegistro={s.id_setor} rotulo={s.nome}
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
        <FormularioSetor registro={painel.registro} colaboradores={colaboradores} controle={controle} aoSalvar={salvar} />
      )}
      {painel?.tipo === 'inativar' && (
        <DialogoInativacao
          titulo="Inativar setor"
          subtitulo={`${painel.registro.nome} · ID ${painel.registro.id_setor}`}
          detalhes={[
            ['Coordenador', painel.registro.nome_coordenador],
            ['Vínculos ativos', `${painel.registro.colaboradores} colaborador(es), ${painel.registro.equipamentos} equipamento(s), ${painel.registro.bens} bem(ns)`]
          ]}
          erros={controle.erros}
          salvando={controle.salvando}
          aoFechar={controle.fechar}
          aoConfirmar={(evento) => executar(() => servico.inativar(painel.registro.id_setor, evento), `Setor ${painel.registro.nome} inativado.`)}
        >
          {controle.erroGeral && <div className="mensagem mensagem-erro">{controle.erroGeral}</div>}
          {(painel.registro.colaboradores + painel.registro.equipamentos + painel.registro.bens) > 0 && (
            <p className="aviso">
              <strong>O setor ainda tem vínculos ativos.</strong>
              Eles continuam ligados ao setor; o setor inativo apenas deixa de aparecer nas listas de novos cadastros.
            </p>
          )}
        </DialogoInativacao>
      )}
    </>
  );
}
