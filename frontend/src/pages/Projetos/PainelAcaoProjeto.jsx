// Janelas de confirmação das ações de vigência do projeto, abertas pelo painel
// "Gerenciar":
//  - Prorrogar: nova data de término previsto, posterior à atual.
//  - Encerrar (RN17): manual, com data; explica os efeitos e pede confirmação
//    explícita. Vínculos e recursos continuam (RN18).
//  - Reabrir: volta a "em andamento" sem mudar as datas, com motivo e
//    confirmação; o encerramento anterior fica no histórico.

import { useState } from 'react';
import { mascaraData, dataParaApi, dataDaApi } from '../../utils/mascaras';

function hojeFormatado() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const TITULOS = { encerrar: 'Encerrar projeto', prorrogar: 'Prorrogar término previsto', reabrir: 'Reabrir projeto' };

export default function PainelAcaoProjeto({ tipo, projeto, erros, salvando, aoConfirmar, aoCancelar }) {
  const [data, setData] = useState(tipo === 'encerrar' ? hojeFormatado() : '');
  const [motivo, setMotivo] = useState('');
  const [ciente, setCiente] = useState(false);
  const campo = tipo === 'encerrar' ? 'data_encerramento' : 'data_fim_prevista';
  const precisaCiencia = tipo !== 'prorrogar';

  function enviar(evento) {
    evento.preventDefault();
    evento.stopPropagation();
    if (precisaCiencia && !ciente) return;
    aoConfirmar(tipo === 'reabrir' ? { motivo } : dataParaApi(data));
  }

  return (
    <form className="janela" onSubmit={enviar} role="dialog" aria-modal="true" noValidate>
      <header className="painel-cabecalho">
        <h2>{TITULOS[tipo]}</h2>
        <span className="id-interno">{projeto.codigo} · {projeto.nome}</span>
      </header>

      <div className="painel-corpo">
        <div className="resumo-projeto">
          <div><span>Início</span><strong>{dataDaApi(projeto.data_inicio)}</strong></div>
          <div>
            <span>Término previsto</span>
            <strong>{projeto.data_fim_prevista ? dataDaApi(projeto.data_fim_prevista) : 'sem término'}</strong>
          </div>
          {tipo === 'reabrir' && (
            <div><span>Encerrado em</span><strong>{dataDaApi(projeto.data_encerramento)}</strong></div>
          )}
        </div>

        {tipo !== 'reabrir' && (
          <label className="campo">
            <span>{tipo === 'encerrar' ? 'Data de encerramento *' : 'Novo término previsto *'}</span>
            <input
              type="text"
              inputMode="numeric"
              value={data}
              placeholder="dd/mm/aaaa"
              autoFocus
              onChange={(e) => setData(mascaraData(e.target.value))}
              className={erros[campo] ? 'com-erro' : ''}
            />
            {erros[campo] && <small className="erro">{erros[campo]}</small>}
          </label>
        )}

        {tipo === 'encerrar' && (
          <div className="aviso">
            <strong>O que acontece ao encerrar o projeto {projeto.codigo}</strong>
            <ul>
              <li>A situação passa a “encerrado”, com a data informada; o projeto deixa de aparecer como em andamento.</li>
              <li>Participantes, licenças, instâncias e apólices continuam vinculados: os vínculos históricos são preservados.</li>
              <li>
                Licenças e apólices não são canceladas, renovadas nem transferidas
                {projeto.licencas_adquiridas + projeto.instancias_responsavel > 0
                  ? ` (${projeto.licencas_adquiridas} licença(s) e ${projeto.instancias_responsavel} instância(s) seguem como estão).`
                  : '.'}
              </li>
              <li>Se for preciso, o projeto pode ser reaberto depois; o encerramento continua no histórico.</li>
            </ul>
          </div>
        )}

        {tipo === 'reabrir' && (
          <>
            <div className="aviso-info">
              O projeto volta para “em andamento”. As datas de início e término previsto não mudam; se o término
              já passou, prorrogue depois. O encerramento anterior continua registrado no histórico.
            </div>
            <label className="campo">
              <span>Motivo da reabertura *</span>
              <textarea rows={3} maxLength={255} value={motivo} autoFocus
                onChange={(e) => setMotivo(e.target.value)} className={erros.motivo ? 'com-erro' : ''} />
              {erros.motivo && <small className="erro">{erros.motivo}</small>}
            </label>
          </>
        )}

        {tipo === 'prorrogar' && (
          <p className="nota">A prorrogação muda só o término previsto; o projeto continua em andamento.</p>
        )}

        {precisaCiencia && (
          <label className="campo-check">
            <input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} />
            <span>
              {tipo === 'encerrar'
                ? `Confirmo o encerramento do projeto ${projeto.codigo} · ${projeto.nome}.`
                : `Confirmo a reabertura do projeto ${projeto.codigo} · ${projeto.nome}.`}
            </span>
          </label>
        )}
      </div>

      <footer className="painel-rodape">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className={tipo === 'prorrogar' ? 'botao-principal' : 'botao-principal botao-principal-perigo'}
          disabled={salvando || (precisaCiencia && !ciente)}>
          {salvando ? 'Gravando...' : TITULOS[tipo].split(' ')[0]}
        </button>
      </footer>
    </form>
  );
}
