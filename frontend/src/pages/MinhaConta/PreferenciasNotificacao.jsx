// Preferências de notificação por tipo de aviso (Protótipo 4; RF_B9, RN24).
// Cada tipo pode ser ativado ou desativado; os tipos com prazo (antecedência
// dos vencimentos, lembrete da autorização pendente) aceitam um ou mais
// prazos. O aviso de conta aguardando aprovação só aparece para o
// Administrador (a API nem o envia ao Operador). Vale para os próximos
// avisos: não altera os já emitidos nem remove demandas do painel.

import { useEffect, useState } from 'react';
import { consultarPreferencias, salvarPreferencias } from '../../services/contaService';
import { mensagemDeErro } from '../../services/api';

const UNIDADES = { dia: ['dia', 'dias'], semana: ['semana', 'semanas'], mes: ['mês', 'meses'] };
const MAXIMOS = { dia: 365, semana: 52, mes: 24 };
const textoPrazo = (p) => `${p.quantidade} ${UNIDADES[p.unidade][p.quantidade === 1 ? 0 : 1]}`;
const usaPrazos = (tipo) => tipo.modo === 'antecedencia' || tipo.modo === 'lembrete';

function NovoPrazo({ aoIncluir }) {
  const [aberto, setAberto] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [unidade, setUnidade] = useState('mes');
  if (!aberto) {
    return <button type="button" className="pilula" onClick={() => setAberto(true)}>+ prazo</button>;
  }
  const valido = Number.isInteger(Number(quantidade)) && Number(quantidade) >= 1 && Number(quantidade) <= MAXIMOS[unidade];
  return (
    <span className="novo-prazo">
      <input type="number" min="1" max={MAXIMOS[unidade]} value={quantidade} aria-label="Quantidade"
        onChange={(e) => setQuantidade(e.target.value)} autoFocus />
      <select value={unidade} onChange={(e) => setUnidade(e.target.value)} aria-label="Unidade">
        <option value="dia">dias</option>
        <option value="semana">semanas</option>
        <option value="mes">meses</option>
      </select>
      <button type="button" className="botao-texto" disabled={!valido}
        onClick={() => { aoIncluir({ quantidade: Number(quantidade), unidade }); setAberto(false); setQuantidade(''); }}>
        incluir
      </button>
      <button type="button" className="botao-texto" onClick={() => setAberto(false)}>cancelar</button>
    </span>
  );
}

export default function PreferenciasNotificacao({ mostrarMensagem }) {
  const [tipos, setTipos] = useState(null);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    consultarPreferencias()
      .then((r) => setTipos(r.tipos))
      .catch((e) => mostrarMensagem('erro', mensagemDeErro(e, 'Não foi possível carregar as preferências.')));
  }, [mostrarMensagem]);

  function mudar(codigo, mudanca) {
    setTipos((atuais) => atuais.map((t) => (t.codigo === codigo ? { ...t, ...mudanca } : t)));
  }

  function incluirPrazo(tipo, prazo) {
    if (tipo.prazos.some((p) => p.quantidade === prazo.quantidade && p.unidade === prazo.unidade)) return;
    mudar(tipo.codigo, { prazos: [...tipo.prazos, prazo] });
  }

  async function salvar() {
    setSalvando(true);
    setErros({});
    try {
      const r = await salvarPreferencias(tipos.map((t) => ({ codigo: t.codigo, ativo: t.ativo, prazos: t.prazos })));
      setTipos(r.tipos);
      mostrarMensagem('sucesso', 'Preferências salvas. Valem para os próximos avisos.');
    } catch (e) {
      if (e.corpo?.erros) setErros(e.corpo.erros);
      else mostrarMensagem('erro', mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="cartao">
      <div className="bloco-secao" style={{ marginTop: 0 }}>
        <h3 style={{ margin: 0, textTransform: 'none', letterSpacing: 0, fontSize: 17, color: 'var(--texto)' }}>
          Preferências de notificação
        </h3>
        <span style={{ textTransform: 'none', letterSpacing: 0 }}>por tipo</span>
      </div>
      {!tipos ? (
        <p className="bloco-pendente">Carregando...</p>
      ) : (
        <>
          <table className="preferencias">
            <thead><tr><th aria-label="Ativo" /><th>Tipo de aviso</th><th>Prazos</th></tr></thead>
            <tbody>
              {tipos.map((tipo) => {
                const erro = erros[`prazos.${tipo.codigo}`] || erros[`preferencias.${tipo.codigo}`];
                return (
                  <tr key={tipo.codigo}>
                    <td>
                      <label className="interruptor" title={tipo.ativo ? 'Desativar' : 'Ativar'}>
                        <input type="checkbox" checked={tipo.ativo} aria-label={`${tipo.nome}: ${tipo.ativo ? 'ativo' : 'desativado'}`}
                          onChange={(e) => mudar(tipo.codigo, { ativo: e.target.checked })} />
                        <span />
                      </label>
                    </td>
                    <td className="tipo-aviso">
                      <strong>{tipo.nome}</strong>
                      <small>{tipo.descricao}</small>
                    </td>
                    <td>
                      <div className="pilulas">
                        {!tipo.ativo && <span className="pilula pilula-desativada">desativado</span>}
                        {tipo.ativo && !usaPrazos(tipo) && <span className="pilula pilula-prazo">{tipo.momento}</span>}
                        {tipo.ativo && usaPrazos(tipo) && (
                          <>
                            {tipo.prazos.map((p) => (
                              <span key={`${p.quantidade}${p.unidade}`} className="pilula pilula-prazo">
                                {textoPrazo(p)}
                                <button type="button" aria-label={`Remover o prazo de ${textoPrazo(p)}`}
                                  onClick={() => mudar(tipo.codigo, { prazos: tipo.prazos.filter((x) => x !== p) })}>×</button>
                              </span>
                            ))}
                            {tipo.prazos.length < 5 && <NovoPrazo aoIncluir={(p) => incluirPrazo(tipo, p)} />}
                          </>
                        )}
                      </div>
                      {erro && <small className="erro">{erro}</small>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="nota" style={{ marginTop: 12 }}>
            Valem para os próximos avisos. Notificações já emitidas são preservadas. Desativar um aviso não remove demandas
            do painel nem altera permissões. A emissão dos avisos e a central de notificações estão em desenvolvimento
            (RF_F13 e RF_S8).
          </p>
          <div className="acoes-cartao" style={{ justifyContent: 'flex-start' }}>
            <button type="button" className="botao-principal" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar preferências'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
