// Aba Perfis e permissões (Protótipo 13.2; RN21, RN41): matriz explicativa e
// não editável. O Administrador atribui o perfil às contas, mas não
// personaliza as permissões. Cada linha vem da API, calculada a partir das
// permissões que a API realmente exige, para a tela nunca dizer uma coisa e
// o sistema fazer outra.

export default function MatrizPermissoes({ dados }) {
  const perfis = dados.perfis || [];
  return (
    <>
      <p className="aviso-info" style={{ marginBottom: 14 }}>
        <strong>Matriz explicativa, não editável.</strong> O Administrador atribui o perfil a cada conta, mas não
        personaliza as permissões do Operador. As mesmas restrições valem na interface e na API.
      </p>
      <div className="tabela-area">
        <table className="tabela">
          <thead>
            <tr>
              <th>Operação</th>
              {perfis.map((p) => <th key={p.id_perfil}>{p.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {(dados.matriz || []).map((linha) => (
              <tr key={linha.operacao}>
                <td>{linha.operacao}</td>
                {perfis.map((p) => {
                  const celula = linha.perfis[p.nome];
                  return (
                    <td key={p.id_perfil}>
                      {celula?.permitido
                        ? <strong style={{ color: 'var(--sucesso-texto)', whiteSpace: 'nowrap' }}>✓ Permitido</strong>
                        : <span className="vazio" style={{ whiteSpace: 'nowrap' }}>— Não</span>}
                      {celula?.observacao && <span className="marca-alocado">{celula.observacao}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
