// Mostrada quando a conta abre, pela URL, uma tela que não pode acessar.

import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

export default function AcessoNegadoPage({ tela }) {
  const { usuario } = useAuth();
  return (
    <main className="conteudo">
      <div className="pagina-estado">
        <h2>Acesso negado</h2>
        <p>
          O perfil <strong>{usuario.perfil}</strong> não tem permissão para abrir
          {tela ? <> a tela <strong>{tela.rotulo}</strong> ({tela.funcao})</> : ' esta tela'}.
        </p>
        <p className="nota">Se precisar deste acesso, fale com um Administrador.</p>
        <Link to="/" className="botao-principal">Voltar ao início</Link>
      </div>
    </main>
  );
}
