// Janela das duas ações próprias do projeto:
//  - Encerrar (RN17): manual, com data; os recursos continuam vinculados (RN18).
//  - Prorrogar: nova data de término previsto, posterior à atual.

import { useState } from 'react';
import { mascaraData, dataParaApi, dataDaApi } from '../../mascaras';

function hojeFormatado() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function PainelAcaoProjeto({ tipo, projeto, erros, salvando, aoConfirmar, aoCancelar }) {
  const encerrar = tipo === 'encerrar';
  const [data, setData] = useState(encerrar ? hojeFormatado() : '');
  const campo = encerrar ? 'data_encerramento' : 'data_fim_prevista';
  const temRecursos = projeto.licencas_adquiridas + projeto.instancias_responsavel > 0;

  function enviar(evento) {
    evento.preventDefault();
    aoConfirmar(dataParaApi(data));
  }

  return (
    <form className="janela" onSubmit={enviar}>
      <header className="painel-cabecalho">
        <h2>{encerrar ? 'Encerrar projeto' : 'Prorrogar término previsto'}</h2>
        <span className="id-interno">{projeto.codigo} · {projeto.nome}</span>
      </header>

      <div className="painel-corpo">
        <div className="resumo-projeto">
          <div><span>Início</span><strong>{dataDaApi(projeto.data_inicio)}</strong></div>
          <div>
            <span>Término previsto atual</span>
            <strong>{projeto.data_fim_prevista ? dataDaApi(projeto.data_fim_prevista) : 'sem término'}</strong>
          </div>
        </div>

        <label className="campo">
          <span>{encerrar ? 'Data de encerramento *' : 'Novo término previsto *'}</span>
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

        {encerrar && (
          <div className="aviso">
            <strong>O encerramento é manual e não mexe nos recursos do projeto</strong>
            {temRecursos ? (
              <p>
                {projeto.licencas_adquiridas} licença(s) e {projeto.instancias_responsavel} instância(s)
                continuam vinculadas a este projeto até alteração manual ou o fim da própria vigência.
                Nada é transferido, renovado ou cancelado automaticamente.
              </p>
            ) : (
              <p>Este projeto não tem licenças nem instâncias vinculadas.</p>
            )}
          </div>
        )}
        {!encerrar && (
          <p className="nota">A prorrogação muda só o término previsto; o projeto continua em andamento.</p>
        )}
      </div>

      <footer className="painel-rodape">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>Cancelar</button>
        <button type="submit" className="botao-principal" disabled={salvando}>
          {salvando ? 'Gravando...' : encerrar ? 'Encerrar projeto' : 'Prorrogar'}
        </button>
      </footer>
    </form>
  );
}
