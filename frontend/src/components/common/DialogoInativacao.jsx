// Painel de inativação ou desligamento com data efetiva (RN37, Protótipo 7):
// a pessoa informa quando o fato aconteceu; a data e a hora do registro são
// geradas pelo sistema ao confirmar, separadamente.

import { useState } from 'react';
import PainelLateral from './PainelLateral.jsx';
import Campo from './Campo.jsx';
import { hojeLocal } from '../../services/api';

export default function DialogoInativacao({
  titulo, subtitulo, detalhes = [], children, rotuloData = 'Data efetiva da inativação',
  dicaData = 'Quando o fato aconteceu. Não pode ser futura.', motivoObrigatorio = false,
  rotuloMotivo = 'Motivo', botao = 'Inativar', erros = {}, salvando = false, aoConfirmar, aoFechar
}) {
  const [form, setForm] = useState({ data_efetiva: hojeLocal(), motivo: '' });
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  return (
    <PainelLateral
      titulo={titulo}
      subtitulo={subtitulo}
      aoFechar={aoFechar}
      aoEnviar={() => aoConfirmar(form)}
      rodape={(
        <>
          <button type="button" className="botao-secundario" onClick={aoFechar}>Cancelar</button>
          <button type="submit" className="botao-principal botao-principal-perigo" disabled={salvando}>
            {salvando ? 'Salvando...' : botao}
          </button>
        </>
      )}
    >
      {detalhes.length > 0 && (
        <dl className="lista-pares">
          {detalhes.map(([rotulo, valor]) => (
            <div key={rotulo} style={{ display: 'contents' }}>
              <dt>{rotulo}</dt>
              <dd>{valor || '—'}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="dupla">
        <Campo rotulo={`${rotuloData} *`} erro={erros.data_efetiva} dica={dicaData}>
          <input
            type="date"
            value={form.data_efetiva}
            max={hojeLocal()}
            onChange={mudar('data_efetiva')}
            className={erros.data_efetiva ? 'com-erro' : ''}
            autoFocus
          />
        </Campo>
        <Campo rotulo="Registro" dica="Data e hora do sistema e usuário.">
          <input type="text" value="gerado ao confirmar" readOnly />
        </Campo>
      </div>

      <Campo rotulo={`${rotuloMotivo}${motivoObrigatorio ? ' *' : ' (opcional)'}`} erro={erros.motivo}>
        <input
          type="text"
          value={form.motivo}
          maxLength={255}
          onChange={mudar('motivo')}
          className={erros.motivo ? 'com-erro' : ''}
        />
      </Campo>

      {children}
    </PainelLateral>
  );
}
