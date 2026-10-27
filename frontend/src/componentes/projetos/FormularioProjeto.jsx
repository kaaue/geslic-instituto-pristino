// Formulário lateral de inclusão e edição de projeto.
// Na edição pelo perfil Operador, abre somente para leitura: alterar dados
// cadastrais é exclusivo do Administrador (RN21).
// Situação e data de encerramento não são editadas aqui: o encerramento é uma
// ação própria, com data, feita pelo botão Encerrar da listagem (RN17).

import { useEffect, useState } from 'react';
import { mascaraCodigoProjeto, mascaraData, dataParaApi, dataDaApi } from '../../mascaras';

const VAZIO = {
  codigo: '',
  nome: '',
  fonte_financiadora: '',
  id_responsavel: '',
  data_inicio: '',
  data_fim_prevista: '',
  participantes: []
};

export default function FormularioProjeto({
  edicao, somenteLeitura, colaboradores, fontes, erros, salvando, aoSalvar, aoCancelar
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

  function adicionarParticipante(id) {
    if (!id) return;
    setForm((atual) => ({ ...atual, participantes: [...atual.participantes, Number(id)] }));
  }

  function removerParticipante(id) {
    setForm((atual) => ({ ...atual, participantes: atual.participantes.filter((p) => p !== id) }));
  }

  const encerrado = edicao && edicao.situacao === 'encerrado';
  const titulo = !edicao ? 'Novo projeto' : somenteLeitura ? 'Projeto' : 'Editar projeto';

  // Responsável atual pode estar inativo; nesse caso ainda aparece na lista
  const responsavelForaDaLista = edicao && edicao.id_responsavel
    && !colaboradores.some((c) => c.id_colaborador === edicao.id_responsavel);

  // Nomes dos participantes: colaboradores ativos e, na edição, também os que
  // já participavam e foram desligados depois (continuam no projeto)
  const colaboradorPorId = new Map(
    [...(edicao?.lista_participantes || []), ...colaboradores].map((c) => [c.id_colaborador, c]));
  const disponiveis = colaboradores.filter((c) => !form.participantes.includes(c.id_colaborador));

  return (
    <form className="painel" onSubmit={enviar}>
      <header className="painel-cabecalho">
        <h2>{titulo}</h2>
        {edicao && <span className="id-interno">Projeto {edicao.codigo}</span>}
      </header>

      <div className="painel-corpo">
        {somenteLeitura && (
          <p className="aviso-info">
            Perfil Operador: alterar os dados cadastrais do projeto é exclusivo do
            perfil Administrador. Para prorrogar o término ou encerrar, use as ações da listagem.
          </p>
        )}

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

        <label className="campo">
          <span>Fonte financiadora *</span>
          <input
            type="text"
            list="lista-fontes"
            value={form.fonte_financiadora}
            placeholder="Termo de Cooperação 08/2025"
            readOnly={somenteLeitura}
            maxLength={120}
            onChange={(e) => mudar('fonte_financiadora', e.target.value)}
            className={erros.fonte_financiadora ? 'com-erro' : ''}
          />
          <datalist id="lista-fontes">
            {fontes.map((f) => <option key={f} value={f} />)}
          </datalist>
          {erros.fonte_financiadora && <small className="erro">{erros.fonte_financiadora}</small>}
        </label>

        <label className="campo">
          <span>Responsável *</span>
          <select
            value={form.id_responsavel}
            disabled={somenteLeitura}
            onChange={(e) => mudar('id_responsavel', e.target.value)}
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
          {erros.id_responsavel && <small className="erro">{erros.id_responsavel}</small>}
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

        <div className="campo">
          <span>Colaboradores participantes</span>
          {!somenteLeitura && (
            <select
              value=""
              onChange={(e) => adicionarParticipante(e.target.value)}
              className={erros.participantes ? 'com-erro' : ''}
              disabled={disponiveis.length === 0}
            >
              <option value="">
                {disponiveis.length ? 'Adicionar colaborador cadastrado...' : 'Todos os colaboradores ativos já foram incluídos'}
              </option>
              {disponiveis.map((c) => (
                <option key={c.id_colaborador} value={c.id_colaborador}>
                  {c.nome} — {c.nome_setor}
                </option>
              ))}
            </select>
          )}
          {form.participantes.length > 0 ? (
            <ul className="lista-participantes">
              {form.participantes.map((id) => {
                const c = colaboradorPorId.get(id);
                return (
                  <li key={id}>
                    <span>
                      {c ? c.nome : `Colaborador ${id}`}
                      <small>
                        {c ? [c.cargo, c.nome_setor].filter(Boolean).join(' · ') : ''}
                        {c && c.ativo === false ? ' · desligado' : ''}
                      </small>
                    </span>
                    {!somenteLeitura && (
                      <button type="button" className="botao-texto" onClick={() => removerParticipante(id)}>
                        Remover
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <small className="dica">
              Nenhum participante. Vincule colaboradores já cadastrados; o cadastro de
              colaboradores é feito na tela própria (RF_B4).
            </small>
          )}
          {erros.participantes && <small className="erro">{erros.participantes}</small>}
        </div>

        {edicao && (
          <div className="resumo-projeto">
            <div>
              <span>Situação</span>
              <strong>{encerrado ? `Encerrado em ${dataDaApi(edicao.data_encerramento)}` : 'Em andamento'}</strong>
            </div>
            <div>
              <span>Recursos vinculados</span>
              <strong>
                {edicao.licencas_adquiridas} licença(s) · {edicao.instancias_responsavel} instância(s)
              </strong>
            </div>
          </div>
        )}

        {!edicao && (
          <p className="nota">
            O projeto é cadastrado em andamento. O encerramento é feito depois, pela
            ação Encerrar, e não transfere, renova nem cancela recursos.
          </p>
        )}
      </div>

      <footer className="painel-rodape">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>
          {somenteLeitura ? 'Fechar' : 'Cancelar'}
        </button>
        {!somenteLeitura && (
          <button type="submit" className="botao-principal" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        )}
      </footer>
    </form>
  );
}
