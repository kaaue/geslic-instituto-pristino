// Histórico de movimentações e auditoria (Protótipo 28; RF_S7, RF_F13, RN22).
// Tela exclusiva do Administrador. Registro imutável com a data e hora do
// registro, a data efetiva, o evento, o registro afetado, o detalhe e a conta
// responsável. Os dados vêm do banco, com filtros e paginação na API.

import { Fragment, useCallback, useEffect, useState } from 'react';
import Paginacao from '../../components/common/Paginacao.jsx';
import Mensagem from '../../components/common/Mensagem.jsx';
import useMensagem from '../../hooks/useMensagem';
import useBuscaComAtraso from '../../hooks/useBuscaComAtraso';
import { listarHistorico, opcoesDoHistorico } from '../../services/historicoService';
import { mensagemDeErro } from '../../services/api';
import { dataDaApi } from '../../utils/mascaras';

const POR_PAGINA = 25;
const FILTROS_VAZIOS = { inicio: '', fim: '', tipo: '', entidade: '', id_usuario: '', busca: '' };

const ROTULO_TIPO = {
  criacao: 'Criação', correcao: 'Correção', exclusao: 'Exclusão', inativacao: 'Inativação',
  reativacao: 'Reativação', encerramento: 'Encerramento', prorrogacao: 'Prorrogação',
  aprovacao: 'Aprovação de acesso', rejeicao: 'Recusa de acesso', perfil: 'Alteração de perfil',
  senha: 'Senha', permissao: 'Permissões'
};
const ROTULO_ENTIDADE = { equipamento: 'Equipamento', projeto: 'Projeto', usuario: 'Conta', perfil: 'Perfil' };

const rotulo = (mapa, valor) => mapa[valor] || valor;

function registradoEm(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

// Lista campo a campo o que mudou entre os dados de antes e depois
function Diferencas({ antes, depois }) {
  const campos = [...new Set([...Object.keys(antes || {}), ...Object.keys(depois || {})])];
  if (campos.length === 0) return <p className="nota">Sem detalhes de valores para este evento.</p>;
  const texto = (v) => (v === null || v === undefined || v === '' ? '—' : Array.isArray(v) ? v.join(', ') || '—' : String(v));
  return (
    <table className="tabela tabela-compacta">
      <thead><tr><th>Campo</th><th>Antes</th><th>Depois</th></tr></thead>
      <tbody>
        {campos.map((campo) => {
          const a = texto(antes?.[campo]);
          const d = texto(depois?.[campo]);
          return (
            <tr key={campo} className={antes && depois && a !== d ? 'linha-alterada' : ''}>
              <td>{campo}</td><td>{antes ? a : ''}</td><td>{depois ? d : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function HistoricoPage() {
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState({ itens: [], total: 0 });
  const [opcoes, setOpcoes] = useState({ tipos: [], entidades: [], responsaveis: [] });
  const [aberto, setAberto] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, mostrarMensagem] = useMensagem(6000);

  useEffect(() => {
    opcoesDoHistorico().then(setOpcoes).catch(() => {});
  }, []);

  const buscar = useCallback(async () => {
    setCarregando(true);
    try {
      setResultado(await listarHistorico({ ...filtros, pagina, por_pagina: POR_PAGINA }));
    } catch (e) {
      mostrarMensagem('erro', mensagemDeErro(e, 'Não foi possível carregar o histórico.'));
    } finally {
      setCarregando(false);
    }
  }, [filtros, pagina, mostrarMensagem]);

  useBuscaComAtraso(buscar);

  function mudarFiltro(campo, valor) {
    setFiltros({ ...filtros, [campo]: valor });
    setPagina(1);
  }

  return (
    <main className="conteudo">
      <div className="titulo-area">
        <div>
          <h2>Histórico de movimentações e auditoria</h2>
          <p className="subtitulo">
            RF_S7 · exclusivo do Administrador · os eventos são gravados automaticamente e não podem ser alterados nem excluídos (RN22).
          </p>
        </div>
      </div>

      <Mensagem mensagem={mensagem} />

      <div className="filtros">
        <div className="linha-filtros">
          <label className="campo">
            <span>De (data efetiva)</span>
            <input type="date" value={filtros.inicio} onChange={(e) => mudarFiltro('inicio', e.target.value)} />
          </label>
          <label className="campo">
            <span>Até</span>
            <input type="date" value={filtros.fim} onChange={(e) => mudarFiltro('fim', e.target.value)} />
          </label>
          <label className="campo">
            <span>Evento</span>
            <select value={filtros.tipo} onChange={(e) => mudarFiltro('tipo', e.target.value)}>
              <option value="">Todos</option>
              {opcoes.tipos.map((t) => <option key={t} value={t}>{rotulo(ROTULO_TIPO, t)}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>Registro</span>
            <select value={filtros.entidade} onChange={(e) => mudarFiltro('entidade', e.target.value)}>
              <option value="">Todos</option>
              {opcoes.entidades.map((t) => <option key={t} value={t}>{rotulo(ROTULO_ENTIDADE, t)}</option>)}
            </select>
          </label>
          <label className="campo">
            <span>Responsável</span>
            <select value={filtros.id_usuario} onChange={(e) => mudarFiltro('id_usuario', e.target.value)}>
              <option value="">Todos</option>
              {opcoes.responsaveis.map((r) => <option key={r.id_usuario} value={r.id_usuario}>{r.nome} ({r.login})</option>)}
            </select>
          </label>
          <label className="campo campo-busca">
            <span>Buscar no detalhe ou motivo</span>
            <input type="text" value={filtros.busca} onChange={(e) => mudarFiltro('busca', e.target.value)} />
          </label>
          {Object.values(filtros).some(Boolean) && (
            <button type="button" className="botao-secundario" onClick={() => { setFiltros(FILTROS_VAZIOS); setPagina(1); }}>Limpar</button>
          )}
        </div>
      </div>

      {carregando && resultado.itens.length === 0 ? (
        <p className="estado-vazio">Carregando histórico...</p>
      ) : resultado.itens.length === 0 ? (
        <p className="estado-vazio">Nenhum evento encontrado com esses filtros.</p>
      ) : (
        <div className="tabela-area">
          <table className="tabela">
            <thead>
              <tr>
                <th>Registrado em</th>
                <th>Data efetiva</th>
                <th>Evento</th>
                <th>Registro</th>
                <th>Detalhe</th>
                <th>Responsável</th>
                <th aria-label="Valores"></th>
              </tr>
            </thead>
            <tbody>
              {resultado.itens.map((item) => (
                <Fragment key={item.id_movimentacao}>
                  <tr>
                    <td className="col-data">{registradoEm(item.registrado_em)}</td>
                    <td className="col-data">{dataDaApi(item.data_evento)}</td>
                    <td><span className="etiqueta-evento">{rotulo(ROTULO_TIPO, item.tipo)}</span></td>
                    <td>{rotulo(ROTULO_ENTIDADE, item.entidade)} #{item.id_registro}</td>
                    <td>
                      {item.descricao}
                      {item.motivo && <span className="marca-alocado">Motivo: {item.motivo}</span>}
                    </td>
                    <td>{item.nome_responsavel}<span className="marca-alocado">{item.login_responsavel}</span></td>
                    <td className="col-acoes">
                      {(item.dados_anteriores || item.dados_posteriores) && (
                        <button type="button" className="botao-texto"
                          onClick={() => setAberto(aberto === item.id_movimentacao ? null : item.id_movimentacao)}>
                          {aberto === item.id_movimentacao ? 'Ocultar' : 'Valores'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {aberto === item.id_movimentacao && (
                    <tr className="linha-detalhe">
                      <td colSpan={7}><Diferencas antes={item.dados_anteriores} depois={item.dados_posteriores} /></td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Paginacao pagina={pagina} porPagina={POR_PAGINA} total={resultado.total} aoMudar={setPagina} />
    </main>
  );
}
