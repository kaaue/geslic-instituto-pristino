// Transferência de privilégios de administrador (Protótipo 13.1; RN27), em
// quatro etapas, sempre com os nomes reais das contas envolvidas:
//   1. Seleção: quem recebe o perfil Administrador (só contas ativas que ainda
//      não são Administrador estão aptas).
//   2. Conta de origem: qual Administrador transfere e o que acontece com a
//      conta dele (continua ativa como Operador, ou é desativada).
//   3. Resumo: o resultado em texto, com data efetiva e motivo.
//   4. Confirmação explícita.
// A API valida tudo de novo e executa numa única transação: as duas contas
// mudam juntas ou nenhuma muda, sempre sobra um Administrador ativo, as
// sessões das contas alteradas são encerradas e a operação fica na auditoria.

import { useState } from 'react';
import { Janela } from '../../components/common/PainelLateral.jsx';
import Campo from '../../components/common/Campo.jsx';
import { hojeLocal } from '../../services/api';

const ETAPAS = ['Seleção', 'Conta de origem', 'Resumo', 'Confirmação'];
const dataBr = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

export default function ModalTransferencia({
  contas, idContaAtual, inicial = {}, erros, erroGeral, salvando, aoConfirmar, aoFechar
}) {
  const ativas = contas.filter((c) => c.situacao === 'ativo');
  const aptas = ativas.filter((c) => c.perfil !== 'Administrador');
  const administradoras = ativas.filter((c) => c.perfil === 'Administrador');
  const origemPadrao = inicial.id_revogada
    ?? (administradoras.some((c) => c.id_usuario === idContaAtual) ? idContaAtual : '');

  const [etapa, setEtapa] = useState(0);
  const [ciente, setCiente] = useState(false);
  const [form, setForm] = useState({
    id_concedida: inicial.id_concedida ? String(inicial.id_concedida) : '',
    id_revogada: origemPadrao ? String(origemPadrao) : '',
    destino_revogada: 'operador',
    data_efetiva: hojeLocal(),
    motivo: ''
  });
  const mudar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const destino = aptas.find((c) => String(c.id_usuario) === form.id_concedida);
  const origem = administradoras.find((c) => String(c.id_usuario) === form.id_revogada);
  const origemEhVoce = origem?.id_usuario === idContaAtual;

  const podeAvancar = [
    Boolean(destino),
    Boolean(origem) && Boolean(form.destino_revogada),
    Boolean(form.motivo.trim()) && Boolean(form.data_efetiva),
    ciente
  ][etapa];

  const resumo = destino && origem && (
    <div className="resumo-transferencia">
      <p>A conta de <strong>{destino.nome}</strong> ({destino.login}) passará a ter perfil <strong>Administrador</strong>.</p>
      <p>
        A conta de <strong>{origem.nome}</strong> ({origem.login}){' '}
        {form.destino_revogada === 'inativar'
          ? <>deixará de ser Administrador e será <strong>desativada</strong> (não é excluída).</>
          : <>passará a ter perfil <strong>Operador</strong> e continuará ativa.</>}
      </p>
      <p>Data efetiva: {dataBr(form.data_efetiva)}. As sessões abertas das duas contas serão encerradas.</p>
      {origemEhVoce && <p>Você está transferindo os seus próprios privilégios e precisará entrar de novo.</p>}
    </div>
  );

  function avancar() {
    if (!podeAvancar) return;
    if (etapa < ETAPAS.length - 1) setEtapa(etapa + 1);
    else aoConfirmar({ ...form, id_concedida: Number(form.id_concedida), id_revogada: Number(form.id_revogada) });
  }

  return (
    <Janela
      titulo="Transferir privilégios de administrador"
      subtitulo={`Etapa ${etapa + 1} de ${ETAPAS.length} · ${ETAPAS[etapa]}`}
      largo
      aoFechar={aoFechar}
      aoEnviar={avancar}
      rodape={(
        <>
          <button type="button" className="botao-secundario" onClick={etapa ? () => setEtapa(etapa - 1) : aoFechar}>
            {etapa ? 'Voltar' : 'Cancelar'}
          </button>
          <button type="submit" className="botao-principal" disabled={!podeAvancar || salvando}>
            {etapa < ETAPAS.length - 1 ? 'Continuar' : salvando ? 'Transferindo...' : 'Confirmar transferência'}
          </button>
        </>
      )}
    >
      <ol className="etapas">
        {ETAPAS.map((nome, i) => (
          <li key={nome} className={i === etapa ? 'atual' : i < etapa ? 'feita' : ''}>{i + 1}. {nome}</li>
        ))}
      </ol>
      {erroGeral && <div className="mensagem mensagem-erro">{erroGeral}</div>}

      {etapa === 0 && (
        <>
          <Campo rotulo="Quem receberá o perfil Administrador *" erro={erros.id_concedida}
            dica="Só contas ativas que ainda não são Administrador estão aptas a receber os privilégios.">
            <select value={form.id_concedida} onChange={mudar('id_concedida')} className={erros.id_concedida ? 'com-erro' : ''}>
              <option value="">Selecione o usuário</option>
              {aptas.map((c) => (
                <option key={c.id_usuario} value={c.id_usuario}>
                  {c.nome} · {c.login}{c.nome_setor ? ` · ${c.nome_setor}` : ''}
                </option>
              ))}
            </select>
          </Campo>
          {destino && (
            <p className="aviso-info">
              {destino.nome} está apto: conta ativa, perfil atual {destino.perfil}
              {destino.nome_colaborador ? `, colaborador ${destino.nome_colaborador}` : ', sem colaborador vinculado'}.
            </p>
          )}
          {aptas.length === 0 && <p className="aviso">Nenhuma conta ativa está apta: todas já são Administrador ou estão desativadas.</p>}
        </>
      )}

      {etapa === 1 && (
        <>
          <Campo rotulo="Administrador que transfere os privilégios (conta de origem) *" erro={erros.id_revogada}>
            <select value={form.id_revogada} onChange={mudar('id_revogada')} className={erros.id_revogada ? 'com-erro' : ''}>
              <option value="">Selecione</option>
              {administradoras.map((c) => (
                <option key={c.id_usuario} value={c.id_usuario}>
                  {c.nome} · {c.login}{c.id_usuario === idContaAtual ? ' (você)' : ''}
                </option>
              ))}
            </select>
          </Campo>
          {origem && (
            <div className="campo" role="radiogroup" aria-label={`O que acontece com a conta de ${origem.nome}`}>
              <span>O que acontece com a conta de {origem.nome}?</span>
              <label className={`opcao-cartao ${form.destino_revogada === 'operador' ? 'marcada' : ''}`}>
                <input type="radio" name="destino" checked={form.destino_revogada === 'operador'}
                  onChange={() => setForm({ ...form, destino_revogada: 'operador' })} />
                <span>
                  Continua ativa, com perfil Operador
                  <small>{origem.nome} segue usando o sistema, sem as funções de Administrador.</small>
                </span>
              </label>
              <label className={`opcao-cartao ${form.destino_revogada === 'inativar' ? 'marcada' : ''}`}>
                <input type="radio" name="destino" checked={form.destino_revogada === 'inativar'}
                  onChange={() => setForm({ ...form, destino_revogada: 'inativar' })} />
                <span>
                  É desativada
                  <small>{origem.nome} perde o acesso. A conta não é excluída; o histórico é preservado.</small>
                </span>
              </label>
            </div>
          )}
        </>
      )}

      {etapa === 2 && (
        <>
          {resumo}
          <div className="dupla">
            <Campo rotulo="Data efetiva *" erro={erros.data_efetiva}>
              <input type="date" value={form.data_efetiva} max={hojeLocal()} onChange={mudar('data_efetiva')} className={erros.data_efetiva ? 'com-erro' : ''} />
            </Campo>
            <Campo rotulo="Motivo da transferência *" erro={erros.motivo}>
              <input type="text" value={form.motivo} maxLength={255} onChange={mudar('motivo')} className={erros.motivo ? 'com-erro' : ''} />
            </Campo>
          </div>
        </>
      )}

      {etapa === 3 && (
        <>
          {resumo}
          <p className="nota">Motivo: {form.motivo}</p>
          <label className="campo-check">
            <input type="checkbox" checked={ciente} onChange={(e) => setCiente(e.target.checked)} />
            <span>Confirmo a transferência dos privilégios de {origem?.nome} para {destino?.nome}.</span>
          </label>
          <p className="aviso">
            A operação é feita de uma só vez: as duas contas mudam juntas ou nenhuma muda. O sistema nunca fica sem
            Administrador ativo, e a transferência fica registrada na auditoria.
          </p>
        </>
      )}
    </Janela>
  );
}
