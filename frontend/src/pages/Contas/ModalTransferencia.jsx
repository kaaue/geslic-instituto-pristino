// Transferir privilégios de administrador (Protótipo 13.1; RN27): troca de
// gestão numa única operação. Concede o perfil à nova gestora e revoga o da
// que sai (rebaixando a Operador ou inativando a conta), com data efetiva e
// motivo. As sessões das contas alteradas são encerradas e tudo fica na
// auditoria. Como uma conta ganha o perfil enquanto a outra perde, sempre
// sobra ao menos um Administrador ativo.

import { useState } from 'react';
import { Janela } from '../../components/common/PainelLateral.jsx';
import Campo from '../../components/common/Campo.jsx';
import { hojeLocal } from '../../services/api';

export default function ModalTransferencia({ contas, erros, erroGeral, salvando, aoConfirmar, aoFechar }) {
  const [form, setForm] = useState({
    id_concedida: '', id_revogada: '', destino_revogada: 'operador', data_efetiva: hojeLocal(), motivo: ''
  });
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });
  const ativas = contas.filter((c) => c.situacao === 'ativo');
  const candidatas = ativas.filter((c) => c.perfil !== 'Administrador');
  const administradoras = ativas.filter((c) => c.perfil === 'Administrador');

  const concedida = candidatas.find((c) => String(c.id_usuario) === form.id_concedida);
  const revogada = administradoras.find((c) => String(c.id_usuario) === form.id_revogada);
  const ficam = administradoras.filter((c) => c !== revogada).map((c) => c.nome).concat(concedida ? [concedida.nome] : []);

  return (
    <Janela
      titulo="Transferir privilégios de administrador"
      subtitulo="Troca de gestão em uma única operação"
      largo
      aoFechar={aoFechar}
      aoEnviar={() => aoConfirmar({ ...form, id_concedida: Number(form.id_concedida), id_revogada: Number(form.id_revogada) })}
      rodape={(
        <>
          <button type="button" className="botao-secundario" onClick={aoFechar}>Cancelar</button>
          <button type="submit" className="botao-principal" disabled={salvando}>{salvando ? 'Transferindo...' : 'Transferir privilégios'}</button>
        </>
      )}
    >
      {erroGeral && <div className="mensagem mensagem-erro">{erroGeral}</div>}
      <div className="dupla">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 className="titulo-secao-painel">Conceder</h3>
          <Campo rotulo="Conta da nova gestora *" erro={erros.id_concedida}>
            <select value={form.id_concedida} onChange={mudar('id_concedida')} className={erros.id_concedida ? 'com-erro' : ''}>
              <option value="">Selecione</option>
              {candidatas.map((c) => <option key={c.id_usuario} value={c.id_usuario}>{c.nome} · {c.login}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Perfil"><input type="text" value="Administrador" readOnly /></Campo>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 className="titulo-secao-painel">Revogar</h3>
          <Campo rotulo="Conta da gestora que sai *" erro={erros.id_revogada}>
            <select value={form.id_revogada} onChange={mudar('id_revogada')} className={erros.id_revogada ? 'com-erro' : ''}>
              <option value="">Selecione</option>
              {administradoras.map((c) => <option key={c.id_usuario} value={c.id_usuario}>{c.nome} · {c.login}</option>)}
            </select>
          </Campo>
          <div className={`segmentado ${erros.destino_revogada ? 'com-erro' : ''}`} role="group" aria-label="O que acontece com a conta que sai">
            <button type="button" aria-pressed={form.destino_revogada === 'operador'} onClick={() => setForm({ ...form, destino_revogada: 'operador' })}>
              Rebaixar a Operador
            </button>
            <button type="button" aria-pressed={form.destino_revogada === 'inativar'} onClick={() => setForm({ ...form, destino_revogada: 'inativar' })}>
              Inativar a conta
            </button>
          </div>
        </div>
      </div>
      <div className="dupla">
        <Campo rotulo="Data efetiva *" erro={erros.data_efetiva}>
          <input type="date" value={form.data_efetiva} onChange={mudar('data_efetiva')} className={erros.data_efetiva ? 'com-erro' : ''} />
        </Campo>
        <Campo rotulo="Motivo *" erro={erros.motivo}>
          <input type="text" value={form.motivo} maxLength={255} onChange={mudar('motivo')} className={erros.motivo ? 'com-erro' : ''} />
        </Campo>
      </div>
      {concedida && revogada && (
        <p className="aviso-sucesso">
          <strong>Resultado:</strong> {ficam.join(' e ')} {ficam.length > 1 ? 'ficarão como Administradoras ativas' : 'ficará como Administradora ativa'} ({ficam.length}).{' '}
          {revogada.nome} {form.destino_revogada === 'inativar' ? 'tem a conta inativada' : 'passa a Operador'}; a conta não é excluída.
        </p>
      )}
      <p className="aviso">
        As sessões abertas das contas alteradas serão encerradas, e a operação fica na auditoria. Revogar ou inativar o último
        Administrador ativo é bloqueado (RN27).
      </p>
    </Janela>
  );
}
