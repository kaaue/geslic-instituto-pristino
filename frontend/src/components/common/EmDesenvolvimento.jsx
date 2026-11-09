// Tela de uma função da ERS que ainda está em desenvolvimento.
// Mostra o que a função vai fazer e quais operações a conta poderá executar
// (pelas permissões reais), sem simular dados: a API dessas operações
// responde 501 até a implementação.

import useAuth from '../../hooks/useAuth';

const ROTULO_MODULO = { licencas: 'Módulo Licenças', apolices: 'Módulo Apólices' };

// operacoes: [{ nome, permissao }] — sem permissão = qualquer conta autenticada
// modulo: 'licencas' ou 'apolices', para o rótulo do módulo acima do título
export default function EmDesenvolvimento({ titulo, funcao, descricao, operacoes = [], regras = [], prototipo, modulo }) {
  const { pode } = useAuth();
  return (
    <main className="conteudo">
      <div className="titulo-area">
        <div>
          {modulo && <span className="rotulo-modulo">{ROTULO_MODULO[modulo]}</span>}
          <h2>{titulo}</h2>
          <p className="subtitulo">{funcao}{prototipo ? ` · Protótipo ${prototipo} da ERS` : ''}</p>
        </div>
      </div>

      <div className="aviso-desenvolvimento" role="status">
        <strong>Em desenvolvimento</strong>
        <p>
          A estrutura desta função já existe (tela, rotas da API e permissões), mas as operações
          ainda não foram implementadas. A API responde <code>501 Não implementado</code> e nenhum
          dado é exibido no lugar.
        </p>
      </div>

      <section className="cartao">
        <h3>O que esta função vai fazer</h3>
        <p>{descricao}</p>
        {regras.length > 0 && (
          <ul className="lista-regras">
            {regras.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
      </section>

      {operacoes.length > 0 && (
        <section className="cartao">
          <h3>Operações previstas e o seu acesso</h3>
          <table className="tabela tabela-compacta">
            <thead>
              <tr><th>Operação</th><th>Sua conta</th></tr>
            </thead>
            <tbody>
              {operacoes.map((op) => (
                <tr key={op.nome}>
                  <td>{op.nome}</td>
                  <td>
                    {pode(op.permissao)
                      ? <span className="situacao situacao-ativo">permitida</span>
                      : <span className="situacao situacao-inativo">sem permissão</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
