// Campo de formulário com rótulo, mensagem de erro e dica, no padrão das
// telas do GESLIC: o erro identifica o campo e preserva o que foi digitado.

export default function Campo({ rotulo, erro, dica, children, className = '' }) {
  return (
    <label className={`campo ${className}`}>
      <span>{rotulo}</span>
      {children}
      {erro && <small className="erro">{erro}</small>}
      {!erro && dica && <small className="dica">{dica}</small>}
    </label>
  );
}
