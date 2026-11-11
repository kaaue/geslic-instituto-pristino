// Seleção de colaboradores (participantes de projeto e vínculo de contas).
//
// BuscaColaborador: campo pesquisável por parte do nome. A lista mostra cargo
// e setor de cada um, para diferenciar homônimos, e esconde quem já foi
// escolhido (sem inclusão duplicada).
//
// SeletorColaboradores: lista de participantes com duas formas de inclusão,
// individual (pela busca) ou em lote por setor. O lote copia a composição do
// setor naquele momento: quem entrar ou sair do setor depois não muda o
// projeto. `fixos` são ids que não podem ser retirados (o responsável).

import { useId, useMemo, useState } from 'react';

const semAcento = (texto) => String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const detalhe = (c) => [c.cargo, c.nome_setor].filter(Boolean).join(' · ');

export function BuscaColaborador({
  colaboradores, excluidos = [], aoEscolher, placeholder = 'Digite parte do nome...', erro, desabilitado
}) {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const idLista = useId();

  const resultados = useMemo(() => {
    const t = semAcento(termo.trim());
    return colaboradores
      .filter((c) => !excluidos.includes(c.id_colaborador))
      .filter((c) => !t || semAcento(c.nome).includes(t))
      .slice(0, 30);
  }, [colaboradores, excluidos, termo]);

  function escolher(c) {
    aoEscolher(c);
    setTermo('');
    setAberto(false);
  }

  return (
    <div className="busca-colaborador">
      <input
        type="search"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={idLista}
        aria-autocomplete="list"
        value={termo}
        placeholder={placeholder}
        disabled={desabilitado}
        className={erro ? 'com-erro' : ''}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={(e) => { setTermo(e.target.value); setAberto(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (resultados[0]) escolher(resultados[0]);
          }
          if (e.key === 'Escape') setAberto(false);
        }}
      />
      {aberto && (
        <ul className="busca-resultados" id={idLista} role="listbox">
          {resultados.length === 0 && <li className="busca-vazio">Nenhum colaborador encontrado.</li>}
          {resultados.map((c) => (
            <li key={c.id_colaborador} role="option" aria-selected="false"
              onMouseDown={(e) => { e.preventDefault(); escolher(c); }}>
              <strong>{c.nome}</strong>
              <small>{detalhe(c)}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SeletorColaboradores({
  selecionados, aoMudar, colaboradores, conhecidos = [], setores = [], fixos = [], somenteLeitura, erro
}) {
  const [modo, setModo] = useState('individual');
  const [idSetor, setIdSetor] = useState('');
  const [marcados, setMarcados] = useState([]);

  const porId = useMemo(
    () => new Map([...conhecidos, ...colaboradores].map((c) => [c.id_colaborador, c])),
    [conhecidos, colaboradores]);

  const doSetor = colaboradores.filter((c) => (c.ids_setores || []).includes(Number(idSetor)));
  const novosDoSetor = doSetor.filter((c) => !selecionados.includes(c.id_colaborador));

  function adicionar(ids) {
    aoMudar([...new Set([...selecionados, ...ids])]);
  }

  function escolherSetor(valor) {
    setIdSetor(valor);
    // por padrão, todos os ativos do setor que ainda não participam
    setMarcados(colaboradores
      .filter((c) => (c.ids_setores || []).includes(Number(valor)) && !selecionados.includes(c.id_colaborador))
      .map((c) => c.id_colaborador));
  }

  function alternar(id) {
    setMarcados((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  function adicionarDoSetor() {
    adicionar(marcados);
    setMarcados([]);
    setIdSetor('');
  }

  return (
    <div className="seletor-colaboradores">
      {!somenteLeitura && (
        <>
          <div className="alternador" role="group" aria-label="Forma de inclusão">
            <button type="button" className={modo === 'individual' ? 'ativo' : ''} onClick={() => setModo('individual')}>
              Individual
            </button>
            <button type="button" className={modo === 'setor' ? 'ativo' : ''} onClick={() => setModo('setor')}>
              Por setor
            </button>
          </div>

          {modo === 'individual' ? (
            <BuscaColaborador
              colaboradores={colaboradores}
              excluidos={selecionados}
              aoEscolher={(c) => adicionar([c.id_colaborador])}
              erro={erro}
            />
          ) : (
            <div className="inclusao-setor">
              <select value={idSetor} onChange={(e) => escolherSetor(e.target.value)}>
                <option value="">Selecione o setor...</option>
                {setores.map((s) => <option key={s.id_setor} value={s.id_setor}>{s.nome}</option>)}
              </select>
              {idSetor && (
                doSetor.length === 0 ? (
                  <small className="dica">Nenhum colaborador ativo neste setor.</small>
                ) : (
                  <>
                    <div className="inclusao-setor-acoes">
                      <small className="dica">{novosDoSetor.length} de {doSetor.length} ainda não participam.</small>
                      {novosDoSetor.length > 0 && (
                        <button type="button" className="botao-texto"
                          onClick={() => setMarcados(marcados.length === novosDoSetor.length ? [] : novosDoSetor.map((c) => c.id_colaborador))}>
                          {marcados.length === novosDoSetor.length ? 'Desmarcar todos' : 'Marcar todos'}
                        </button>
                      )}
                    </div>
                    <ul className="lista-marcavel">
                      {doSetor.map((c) => {
                        const ja = selecionados.includes(c.id_colaborador);
                        return (
                          <li key={c.id_colaborador}>
                            <label>
                              <input type="checkbox" disabled={ja} checked={ja || marcados.includes(c.id_colaborador)}
                                onChange={() => alternar(c.id_colaborador)} />
                              <span>{c.nome}<small>{c.cargo || ''}{ja ? ' · já participa' : ''}</small></span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <button type="button" className="botao-secundario" disabled={!marcados.length} onClick={adicionarDoSetor}>
                      Adicionar {marcados.length || ''} selecionado{marcados.length === 1 ? '' : 's'}
                    </button>
                    <small className="dica">
                      A inclusão vale para quem está no setor agora; mudanças futuras no setor não alteram o projeto.
                    </small>
                  </>
                )
              )}
            </div>
          )}
        </>
      )}

      {selecionados.length > 0 ? (
        <ul className="lista-participantes">
          {selecionados.map((id) => {
            const c = porId.get(id);
            const fixo = fixos.includes(id);
            return (
              <li key={id}>
                <span>
                  {c ? c.nome : `Colaborador ${id}`}
                  {fixo && <span className="marca-alocado">responsável</span>}
                  <small>{c ? detalhe(c) : ''}{c && c.ativo === false ? ' · desligado' : ''}</small>
                </span>
                {!somenteLeitura && !fixo && (
                  <button type="button" className="botao-texto" onClick={() => aoMudar(selecionados.filter((x) => x !== id))}>
                    Remover
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <small className="dica">Nenhum participante. O responsável entra automaticamente ao ser escolhido.</small>
      )}
      {erro && <small className="erro">{erro}</small>}
    </div>
  );
}
