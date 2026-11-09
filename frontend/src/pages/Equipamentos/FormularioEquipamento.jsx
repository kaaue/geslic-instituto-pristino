// Formulário lateral de inclusão e edição de equipamento.
// O mesmo componente serve para os dois casos: quando recebe um equipamento
// em "edicao", preenche os campos; quando recebe null, começa em branco.

import { useEffect, useState } from 'react';
import {
  mascaraEtiquetaInstituto,
  mascaraEtiquetaNetscanner
} from '../../utils/mascaras';

const VAZIO = {
  etiqueta_instituto: '',
  etiqueta_netscanner: '',
  tipo: '',
  identificacao: '',
  id_setor: '',
  id_responsavel: '',
  uso_geral: false,
  situacao: 'ativo',
  categoria: 'equipamento'
};

const TIPOS = ['Notebook', 'Desktop', 'Tablet', 'Servidor', 'Estação gráfica',
  'Impressora', 'Projetor', 'Outro'];

export default function FormularioEquipamento({
  edicao, setores, colaboradores, erros, aoSalvar, aoCancelar, salvando, avisoInativacao
}) {
  const [form, setForm] = useState(VAZIO);

  // Quando muda o equipamento em edição, recarrega os campos
  useEffect(() => {
    if (edicao) {
      setForm({
        etiqueta_instituto: edicao.etiqueta_instituto || '',
        etiqueta_netscanner: edicao.etiqueta_netscanner || '',
        tipo: edicao.tipo || '',
        identificacao: edicao.identificacao || '',
        id_setor: edicao.id_setor || '',
        id_responsavel: edicao.id_responsavel || '',
        uso_geral: Boolean(edicao.uso_geral),
        situacao: edicao.situacao || 'ativo',
        categoria: edicao.categoria || 'equipamento'
      });
    } else {
      setForm(VAZIO);
    }
  }, [edicao]);

  function mudar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  // Marcar uso geral limpa o responsável: equipamento compartilhado
  // não tem colaborador nominal
  function mudarUsoGeral(marcado) {
    setForm((atual) => ({
      ...atual,
      uso_geral: marcado,
      id_responsavel: marcado ? '' : atual.id_responsavel
    }));
  }

  function enviar(evento) {
    evento.preventDefault();
    aoSalvar({
      ...form,
      id_responsavel: form.id_responsavel || null
    });
  }

  const inativando = edicao && edicao.situacao === 'ativo' && form.situacao === 'inativo';

  return (
    <form className="painel" onSubmit={enviar}>
      <header className="painel-cabecalho">
        <h2>{edicao ? 'Editar equipamento' : 'Novo equipamento'}</h2>
        {edicao && <span className="id-interno">ID interno {edicao.id_equipamento}</span>}
      </header>

      <div className="painel-corpo">
        {!edicao && (
          <p className="nota">
            O ID interno é gerado pelo sistema quando o equipamento é gravado.
          </p>
        )}

        <label className="campo">
          <span>Etiqueta do Instituto *</span>
          <input
            type="text"
            value={form.etiqueta_instituto}
            placeholder="IP0000"
            onChange={(e) => mudar('etiqueta_instituto', mascaraEtiquetaInstituto(e.target.value))}
            className={erros.etiqueta_instituto ? 'com-erro' : ''}
          />
          {erros.etiqueta_instituto && <small className="erro">{erros.etiqueta_instituto}</small>}
        </label>

        <label className="campo">
          <span>Etiqueta NetScanner</span>
          <input
            type="text"
            value={form.etiqueta_netscanner}
            placeholder="NS-000000"
            onChange={(e) => mudar('etiqueta_netscanner', mascaraEtiquetaNetscanner(e.target.value))}
            className={erros.etiqueta_netscanner ? 'com-erro' : ''}
          />
          {erros.etiqueta_netscanner
            ? <small className="erro">{erros.etiqueta_netscanner}</small>
            : <small className="dica">Opcional. Quando preenchida, não pode repetir.</small>}
        </label>

        <label className="campo">
          <span>Identificação *</span>
          <input
            type="text"
            value={form.identificacao}
            placeholder="Notebook Dell Latitude 5440"
            onChange={(e) => mudar('identificacao', e.target.value)}
            className={erros.identificacao ? 'com-erro' : ''}
          />
          {erros.identificacao && <small className="erro">{erros.identificacao}</small>}
        </label>

        <div className="dupla">
          <label className="campo">
            <span>Tipo *</span>
            <select
              value={form.tipo}
              onChange={(e) => mudar('tipo', e.target.value)}
              className={erros.tipo ? 'com-erro' : ''}
            >
              <option value="">Selecione</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {erros.tipo && <small className="erro">{erros.tipo}</small>}
          </label>

          <label className="campo">
            <span>Setor *</span>
            <select
              value={form.id_setor}
              onChange={(e) => mudar('id_setor', e.target.value)}
              className={erros.id_setor ? 'com-erro' : ''}
            >
              <option value="">Selecione</option>
              {setores.map((s) => (
                <option key={s.id_setor} value={s.id_setor}>{s.nome}</option>
              ))}
            </select>
            {erros.id_setor && <small className="erro">{erros.id_setor}</small>}
          </label>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.uso_geral}
            onChange={(e) => mudarUsoGeral(e.target.checked)}
          />
          <span>
            Equipamento de uso geral
            <small>Compartilhado, como os da sala de reunião. Não tem responsável nominal.</small>
          </span>
        </label>

        <label className="campo">
          <span>Colaborador responsável</span>
          <select
            value={form.id_responsavel}
            onChange={(e) => mudar('id_responsavel', e.target.value)}
            disabled={form.uso_geral}
            className={erros.id_responsavel ? 'com-erro' : ''}
          >
            <option value="">{form.uso_geral ? 'Não se aplica' : 'Sem responsável'}</option>
            {colaboradores.map((c) => (
              <option key={c.id_colaborador} value={c.id_colaborador}>
                {c.nome} — {c.nome_setor}
              </option>
            ))}
          </select>
          {erros.id_responsavel && <small className="erro">{erros.id_responsavel}</small>}
        </label>

        <label className="campo">
          <span>Situação</span>
          <select value={form.situacao} onChange={(e) => mudar('situacao', e.target.value)}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo (descartado)</option>
          </select>
          <small className="dica">
            Não há situação de manutenção. Inativo significa descarte ou sem retorno ao uso.
          </small>
        </label>

        {/* Aviso da RN08: ao inativar, as instâncias não transferíveis
            alocadas ao equipamento passam a inativas */}
        {inativando && avisoInativacao && (
          <div className="aviso">
            <strong>Atenção ao inativar este equipamento</strong>
            {avisoInativacao.nao_transferiveis.length > 0 && (
              <p>
                {avisoInativacao.nao_transferiveis.length === 1
                  ? 'A instância a seguir ficará inativa porque a licença não é transferível: '
                  : 'As instâncias a seguir ficarão inativas porque as licenças não são transferíveis: '}
                {avisoInativacao.nao_transferiveis
                  .map((i) => `${i.nome_software} (${i.identificacao})`).join(', ')}.
              </p>
            )}
            {avisoInativacao.transferiveis.length > 0 && (
              <p>
                {avisoInativacao.transferiveis
                  .map((i) => `${i.nome_software} (${i.identificacao})`).join(', ')}
                {avisoInativacao.transferiveis.length === 1
                  ? ' permanece ativa e pode ser liberada ou transferida.'
                  : ' permanecem ativas e podem ser liberadas ou transferidas.'}
              </p>
            )}
            {avisoInativacao.nao_transferiveis.length === 0
              && avisoInativacao.transferiveis.length === 0 && (
              <p>Nenhuma instância de licença está alocada a este equipamento.</p>
            )}
          </div>
        )}
      </div>

      <footer className="painel-rodape">
        <button type="button" className="botao-secundario" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="submit" className="botao-principal" disabled={salvando}>
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </footer>
    </form>
  );
}
