// Caminho que não corresponde a nenhuma tela.

import { Link, useLocation } from 'react-router-dom';

export default function NaoEncontradaPage() {
  const { pathname } = useLocation();
  return (
    <main className="conteudo">
      <div className="pagina-estado">
        <h2>Página não encontrada</h2>
        <p>Não existe uma tela em <code>{pathname}</code>.</p>
        <Link to="/" className="botao-principal">Voltar ao início</Link>
      </div>
    </main>
  );
}
