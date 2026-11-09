// Campo de senha nova com a lista de requisitos, que vai sendo marcada
// enquanto a pessoa digita.

import { REGRAS_SENHA } from '../../utils/senha';

export default function CampoSenha({ rotulo = 'Senha', valor, aoMudar, erro, autoComplete = 'new-password', comRequisitos = true }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <input
        type="password"
        value={valor}
        onChange={(e) => aoMudar(e.target.value)}
        autoComplete={autoComplete}
        className={erro ? 'com-erro' : ''}
      />
      {erro && <small className="erro">{erro}</small>}
      {comRequisitos && (
        <ul className="requisitos" aria-label="Requisitos da senha">
          {REGRAS_SENHA.map((r) => {
            const ok = r.ok(valor || '');
            return (
              <li key={r.texto} className={ok ? 'requisito-ok' : ''}>
                <span aria-hidden="true">{ok ? '✓' : '•'}</span> {r.texto}
              </li>
            );
          })}
        </ul>
      )}
    </label>
  );
}
