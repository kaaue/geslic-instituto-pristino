// Escolha de um ou mais setores do colaborador (colaborador_setor). Lista de
// marcar, com o estilo das listas de seleção do sistema. `setores` são as
// opções (os ativos e, na edição, os inativos já vinculados).

export default function SeletorSetores({
  setores, selecionados, aoMudar, erro, rotulo = 'Setores *', dica = 'Marque todos os setores em que a pessoa atua.'
}) {
  const alternar = (id) => aoMudar(selecionados.includes(id) ? selecionados.filter((x) => x !== id) : [...selecionados, id]);

  return (
    <fieldset className="campo campo-setores">
      <legend>{rotulo}</legend>
      <ul className={`lista-marcavel${erro ? ' com-erro' : ''}`}>
        {setores.map((s) => (
          <li key={s.id_setor}>
            <label>
              <input type="checkbox" checked={selecionados.includes(s.id_setor)} onChange={() => alternar(s.id_setor)} />
              <span>{s.nome}</span>
            </label>
          </li>
        ))}
      </ul>
      {erro ? <small className="erro">{erro}</small> : dica && <small className="dica">{dica}</small>}
    </fieldset>
  );
}
