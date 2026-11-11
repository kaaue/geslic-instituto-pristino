// Estrutura das telas autenticadas, no padrão dos protótipos da ERS
// (Apêndice 2) e da Revisão de UX/UI v0.1. O cabeçalho ocupa a largura toda,
// em azul profundo: à esquerda, o nome GESLIC; depois, o caminho de
// navegação, o sino, a conta conectada e o único comando Sair. Abaixo dele, o
// menu lateral claro, com as seções (Início, Gestão, Cadastros, Consultas,
// Sistema) com título e linha guia, filtradas pelas permissões da conta, e a
// logo do Instituto centralizada no espaço livre abaixo dos itens; ao lado, a
// área de trabalho.

import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { menuDaConta, telaDoCaminho } from '../../config/navegacao';
import logoPristino from '../../assets/logo-pristino.png';

// "Helena Moraes" -> "HM"
function iniciais(nome) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] || '') + (partes.length > 1 ? partes.at(-1)[0] : '')).toUpperCase();
}

export default function Layout() {
  const { usuario, pode, sair, recarregar, trocaSenhaObrigatoria } = useAuth();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const tela = telaDoCaminho(pathname);
  const secoes = trocaSenhaObrigatoria ? [] : menuDaConta(pode);

  // A cada troca de tela, relê perfil e permissões na API: uma mudança feita
  // por um Administrador aparece no menu sem precisar sair e entrar.
  useEffect(() => {
    recarregar();
  }, [pathname, recarregar]);

  async function encerrarSessao() {
    await sair();
    navegar('/login', { replace: true });
  }

  return (
    <div className={`aplicacao modulo-${tela?.modulo || 'geral'}`}>
      <header className="barra-superior">
        <Link to="/" className="marca" aria-label="GESLIC: ir para o painel">GESLIC</Link>
        <nav className="trilha" aria-label="Caminho">
          <span>Instituto Prístino</span>
          {tela?.secao && <><span className="trilha-separador">/</span><span>{tela.secao}</span></>}
          <span className="trilha-separador">/</span>
          <strong>{tela?.titulo || tela?.rotulo || 'Página'}</strong>
        </nav>
        <div className="barra-direita">
          {!trocaSenhaObrigatoria && (
            <Link to="/notificacoes" className="sino" title="Central de notificações (em desenvolvimento)" aria-label="Notificações">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z M10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
            </Link>
          )}
          <Link to="/minha-conta" className="conta-atual" title="Minha conta">
            <span className="avatar" aria-hidden="true">{iniciais(usuario.nome)}</span>
            <span className="conta-texto">
              <span className="conta-nome">{usuario.nome}</span>
              <span className="conta-perfil">{usuario.perfil}</span>
            </span>
          </Link>
          <button type="button" className="botao-sair" onClick={encerrarSessao}>Sair</button>
        </div>
      </header>

      <div className="corpo-aplicacao">
      <aside className="menu-lateral">
        <nav aria-label="Menu principal">
          {secoes.map((grupo) => (
            <div className="menu-grupo" key={grupo.titulo}>
              <span className="menu-titulo" id={`menu-${grupo.titulo}`}>{grupo.titulo}</span>
              <div className="menu-itens" role="group" aria-labelledby={`menu-${grupo.titulo}`}>
                {grupo.itens.map((item) => (
                  <NavLink
                    key={item.caminho}
                    to={item.caminho}
                    end={item.caminho === '/'}
                    className={({ isActive }) => (isActive ? 'menu-link menu-link-ativo' : 'menu-link')}
                  >
                    <span className="menu-rotulo">{item.rotulo}</span>
                    {item.pendente && <span className="menu-em-breve">em breve</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logo do Instituto direto sobre o fundo claro do menu, centralizada
            no espaço livre abaixo dos itens. O logotipo não é alterado (OBS-04). */}
        <div className="menu-logo">
          <img src={logoPristino} alt="Instituto Prístino" width="300" height="246" />
        </div>
      </aside>

      <div className="area-principal">
        <Outlet />
      </div>
      </div>
    </div>
  );
}
