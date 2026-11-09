// Painel lateral do projeto: inclusão e "Gerenciar" (visualização, edição,
// participantes, vigência e histórico num único lugar).
// Na edição pelo perfil Operador, os dados abrem somente para leitura: alterar
// dados cadastrais é exclusivo do Administrador (RN21). Prorrogar, encerrar e
// reabrir ficam na seção "Vigência e situação", separada da edição, e abrem
// uma janela de confirmação própria.
// O responsável entra automaticamente entre os participantes e não pode ser
// retirado enquanto for o responsável (a API aplica a mesma regra).

import { useEffect, useState } from 'react';
import SeletorColaboradores from '../../components/common/SeletorColaboradores.jsx';
import { mascaraCodigoProjeto, mascaraData, dataParaApi, dataDaApi } from '../../utils/mascaras';

const VAZIO = {
  codigo: '',
  nome: '',
  fonte_financiadora: '',
  id_responsavel: '',
  data_inicio: '',
  data_fim_prevista: '',
  participantes: []
};

const ROTULO_EVENTO = {
  criacao: 'Cadastro', correcao: 'Correção', prorrogacao: 'Prorrogação',
  encerramento: 'Encerramento', reabertura: 'Reabertura'
};

// atalhoAjuste: botão "Solicitar ajuste deste projeto" (RF_B10), mostrado na consulta pelo Operador
// historico: eventos do projeto (só para quem consulta a auditoria), ou null
export default function FormularioProjeto({
  edicao, somenteLeitura, colaboradores, setores, fontes, erros, salvando, permissoes,
  aoSalvar, aoCancelar, aoAcao, historico = null, atalhoAjuste = null
}) {
  const [form, setForm] = useState(VAZIO);

  useEffect(() => {
    if (edicao) {
      setForm({
        codigo: edicao.codigo || '',
        nome: edicao.nome || '',
        fonte_financiadora: edicao.fonte_financiadora || '',
        id_responsavel: edicao.id_responsavel || '',
        data_inicio: dataDaApi(edicao.data_inicio),
        data_fim_prevista: dataDaApi(edicao.data_fim_prevista),
        participantes: (edicao.lista_participantes || []).map((c) => c.id_colaborador)
      });
    } else {
      setForm(VAZIO);
    }
  }, [edicao]);

  function mudar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  // Ao escolher o responsável, ele entra nos participantes (sem repetir).
  // Trocar de responsável não retira o anterior.
  function mudarResponsavel(valor) {
    setForm((atual) => {
      const id = Number(valor);
      const participantes = id && !atual.participantes.includes(id) ? [...atual.participantes, id] : atual.participantes;
      return { ...atual, id_responsavel: valor, participantes };
    });
  }

  function enviar(evento) {
    evento.preventDefault();
    if (somenteLeitura) return;
    aoSalvar({
      ...form,
      id_responsavel: form.id_responsavel || null,
      data_inicio: dataParaApi(form.data_inicio),
      data_fim_prevista: dataParaApi(form.data_fim_prevista)
    });
  }

  const encerrado = edicao && edicao.situacao === 'encerrado';
  const titulo = !edicao ? 'Novo projeto' : 'Gerenciar projeto';

  // Responsável atual pode estar inativo; nesse caso ainda aparece na lista
  const responsavelForaDaLista = edicao && edicao.id_responsavel
    && !colaboradores.some((c) => c.id_colaborador === edicao.id_responsavel);

  return (
    <form className="painel painel-largo" onSubmit={enviar} noValidate>
      <header className="painel-cabecalho">
        <h2>{titulo}</h2>
        {edicao && (
          <span className="id-interno">
            {edicao.codigo} · {edicao.nome} · {encerrado ? `encerrado em ${dataDaApi(edicao.data_encerramento)}` : 'em andamento'}
          </span>
        )}
      </header>

      <div className="painel-corpo">
        {somenteLeitura && (
          <>
            <p className="aviso-info">
              Após a criação, somente o Administrador altera os dados e os participantes. Para incluir ou retirar
              alguém, ou corrigir um dado, emita uma solicitação de ajuste (RN38). Prorrogar e encerrar ficam
              na seção “Vigência e situação”, abaixo.
            </p>
            {atalhoAjuste}
          </>
        )}

        <h3 className="secao-painel">Dados do projeto</h3>
        <div className="dupla dupla-codigo">
          <label className="campo">
            <span>Código *</span>
            <input
              type="text"
              inputMode="numeric"
              value={form.codigo}
              placeholder="0000"
              readOnly={somenteLeitura}
              onChange={(e) => mudar('codigo', mascaraCodigoProjeto(e.target.value))}
              className={erros.codigo ? 'com-erro' : ''}
            />
            {erros.codigo
              ? <small className="erro">{erros.codigo}</small>
              : <small className="dica">4 dígitos, informado pela gestão.</small>}
          </label>

          <label className="campo">
            <span>Nome *</span>
            <input
              type="text"
              value={form.nome}
              placeholder="CAOMA 2026–2027"
              readOnly={somenteLeitura}
              maxLength={120}
              onChange={(e) => mudar('nome', e.target.value)}
              className={erros.nome ? 'com-erro' : ''}
            />
            {erros.nome
              ? <small className="erro">{erros.nome}</small>
              : <small className="dica">Não pode repetir o nome de outro projeto.</small>}
          </label>
        </div>

        {/* Texto livre. As fontes já usadas aparecem como sugestão ao digitar;
            sem sugestões, o campo não tem a lista (e o navegador não mostra a seta). */}
        <label className="campo">
          <span>Fonte financiadora *</span>
          <input
            type="text"
            list={!somenteLeitura && fontes.length ? 'lista-fontes' : undefined}
            value={form.fonte_financiadora}
            placeholder="Termo de Cooperação 08/2025"
            readOnly={somenteLeitura}
            maxLength={120}
            autoComplete="off"
            onChange={(e) => mudar('fonte_financiadora', e.target.value)}
            className={`campo-texto-sugestoes ${erros.fonte_financiadora ? 'com-erro' : ''}`}
          />
          {!somenteLeitura && fontes.length > 0 && (
            <datalist id="lista-fontes">
              {fontes.map((f) => <option key={f} value={f} />)}
            </datalist>
          )}
          {erros.fonte_financiadora
            ? <small className="erro">{erros.fonte_financiadora}</small>
            : !somenteLeitura && <small className="dica">Texto livre; as fontes já usadas aparecem como sugestão.</small>}
        </label>

        <label className="campo">
          <span>Responsável *</span>
          <select
            value={form.id_responsavel}
            disabled={somenteLeitura}
            onChange={(e) => mudarResponsavel(e.target.value)}
            className={erros.id_responsavel ? 'com-erro' : ''}
          >
            <option value="">Selecione o colaborador responsável</option>
            {responsavelForaDaLista && (
              <option value={edicao.id_responsavel}>{edicao.nome_responsavel} (inativo)</option>
            )}
            {colaboradores.map((c) => (
              <option key={c.id_colaborador} value={c.id_colaborador}>
                {c.nome} — {c.nome_setor}
              </option>
            ))}
          </select>
          {erros.id_responsavel
            ? <small className="erro">{erros.id_responsavel}</small>
            : <small className="dica">O responsável entra automaticamente entre os participantes.</small>}
        </label>

        <div className="dupla">
          <label className="campo">
            <span>Início *</span>
            <input
              type="text"
              inputMode="numeric"
              value={form.data_inicio}
              placeholder="dd/mm/aaaa"
              readOnly={somenteLeitura}
              onChange={(e) => mudar('data_inicio', mascaraData(e.target.value))}
              className={erros.data_inicio ? 'com-erro' : ''}
            />
            {erros.data_inicio && <small className="erro">{erros.data_inicio}</small>}
          </label>

          <label className="campo">
            <span>Término previsto</span>
            <input
              type="text"
              inputMode="numeric"
              value={form.data_fim_prevista}
              placeholder="dd/mm/aaaa"
              readOnly={somenteLeitura}
              onChange={(e) => mudar('data_fim_prevista', mascaraData(e.target.value))}
              className={erros.data_fim_prevista ? 'com-erro' : ''}
            />
            {erros.data_fim_prevista
              ? <small className="erro">{erros.data_fim_prevista}</small>
              : <small className="dica">Opcional. Gera avisos e pode ser prorrogado.</small>}
          </label>
        </div>

        <h3 className="secao-painel">Participantes</h3>
        <SeletorColaboradores
          selecionados={form.participantes}
          aoMudar={(lista) => mudar('participantes', lista)}
          colaboradores={colaboradores}
          conhecidos={edicao?.lista_participantes || []}
          setores={setores}
          fixos={form.id_responsavel ? [Number(form.id_responsavel)] : []}
          somenteLeitura={somenteLeitura}
          erro={erros.participantes}
        />

        {edicao && (
          <>
            <h3 className="secao-painel">Vigência e situação</h3>
            <div className="resumo-projeto">
              <div>
                <span>Situação</span>
                <strong>{encerrado ? `Encerrado em ${dataDaApi(edicao.data_encerramento)}` : 'Em andamento'}</strong>
              </div>
              <div>
                <span>Término previsto</span>
                <strong>{edicao.data_fim_prevista ? dataDaApi(edicao.data_fim_prevista) : 'sem término'}</strong>
              </div>
              <div>
                <span>Recursos vinculados</span>
                <strong>{edicao.licencas_adquiridas} licença(s) · {edicao.instancias_responsavel} instância(s)</strong>
              </div>
            </div>
            <div className="acoes-painel">
              {!encerrado && permissoes.prorrogar && (
                <button type="button" className="botao-secundario" onClick={() => aoAcao('prorrogar')}>
                  Prorrogar término
                </button>
              )}
            </div>
            {(permissoes.encerrar) && (
              <div className="zona-sensivel">
                <div>
                  <strong>{encerrado ? 'Reabrir projeto' : 'Encerrar projeto'}</strong>
                  <p>
                    {encerrado
                      ? 'Volta o projeto para “em andamento” sem alterar as datas. O encerramento anterior continua no histórico.'
                      : 'Encerramento administrativo, com data. Vínculos e recursos são preservados.'}
                  </p>
                </div>
                <button type="button" className="botao-perigo-contorno"
                  onClick={() => aoAcao(encerrado ? 'reabrir' : 'encerrar')}>
                  {encerrado ? 'Reabrir projeto' : 'Encerrar projeto'}
                </button>
              </div>
            )}

            {historico && (
              <>
                <h3 className="secao-painel">Histórico do projeto</h3>
                {historico.length === 0 ? (
                  <small className="dica">Nenhum evento registrado.</small>
                ) : (
                  <ul className="linha-do-tempo">
                    {historico.map((h) => (
                      <li key={h.id_movimentacao}>
                        <span className="linha-do-tempo-data">{dataDaApi(h.data_evento)}</span>
                        <span>
                          <strong>{ROTULO_EVENTO[h.tipo] || h.tipo}</strong> · {h.descricao}
                          <small>por {h.nome_responsavel}{h.motivo ? ` · motivo: ${h.motivo}` : ''}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}

        {!edicao && (
          <p className="nota">
            O projeto é cadastrado em andamento. Encerrar, reabrir e prorrogar ficam no painel do projeto,
            pelo botão Gerenciar; nada disso transfere, renova ou cancela recursos.
          </p>
        )}
      </div>

      <footer className="painel-rodape">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>
          {somenteLeitura ? 'Fechar' : 'Cancelar'}
        </button>
        {!somenteLeitura && (
          <button type="submit" className="botao-principal" disabled={salvando}>
            {salvando ? 'Salvando...' : edicao ? 'Salvar alterações' : 'Cadastrar projeto'}
          </button>
        )}
      </footer>
    </form>
  );
}
