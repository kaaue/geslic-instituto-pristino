// Estrutura das telas autenticadas, no padrão dos protótipos da ERS
// (Apêndice 2): menu lateral claro, com a logo do Instituto e o item ativo em azul, filtrado pelas
// permissões da conta, com a conta e o botão Sair no rodapé; barra superior
// com o caminho de navegação, o sino de notificações e a conta.

import { useEffect, useState } from 'react';
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
  // A entrada Cadastros abre sozinha quando a tela atual é um cadastro
  const [cadastrosAbertos, setCadastrosAbertos] = useState(tela?.secao === 'Cadastros');
  useEffect(() => {
    if (tela?.secao === 'Cadastros') setCadastrosAbertos(true);
  }, [tela?.secao]);

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
      <aside className="menu-lateral">
        <Link to="/" className="marca" aria-label="GESLIC, Instituto Prístino: ir para o painel">
          <img src={logoPristino} alt="Instituto Prístino" width="118" height="97" />
          <strong>GESLIC</strong>
        </Link>

        <nav aria-label="Menu principal">
          {!trocaSenhaObrigatoria && menuDaConta(pode).map((grupo, i) => (grupo.expansivel ? (
            <div className="menu-grupo" key={grupo.titulo}>
              <button
                type="button"
                className="menu-link menu-expansivel"
                aria-expanded={cadastrosAbertos}
                onClick={() => setCadastrosAbertos(!cadastrosAbertos)}
              >
                <span className="menu-icone" aria-hidden="true">{grupo.icone}</span>
                <span className="menu-rotulo">{grupo.titulo}</span>
                <span className="menu-seta" aria-hidden="true">▸</span>
              </button>
              {cadastrosAbertos && (
                <div className="menu-subitens">
                  {grupo.itens.map((item) => (
                    <NavLink
                      key={item.caminho}
                      to={item.caminho}
                      className={({ isActive }) => (isActive ? 'menu-link menu-link-ativo' : 'menu-link')}
                    >
                      <span className="menu-rotulo">{item.rotulo}</span>
                      {item.pendente && <span className="marca-pendente" title="Em desenvolvimento" aria-label="em desenvolvimento" />}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={`menu-grupo ${grupo.modulo ? `menu-${grupo.modulo}` : ''}`} key={grupo.titulo ?? i}>
              {grupo.titulo && <span className="menu-titulo">{grupo.titulo}</span>}
              {grupo.itens.map((item) => (
                <NavLink
                  key={item.caminho}
                  to={item.caminho}
                  end={item.caminho === '/'}
                  className={({ isActive }) => (isActive ? 'menu-link menu-link-ativo' : 'menu-link')}
                >
                  <span className="menu-icone" aria-hidden="true">{item.icone}</span>
                  <span className="menu-rotulo">{item.rotulo}</span>
                  {item.pendente && <span className="marca-pendente" title="Em desenvolvimento" aria-label="em desenvolvimento" />}
                </NavLink>
              ))}
            </div>
          )))}
          {!trocaSenhaObrigatoria && (
            <p className="menu-legenda"><span className="marca-pendente" aria-hidden="true" /> em desenvolvimento</p>
          )}
        </nav>

        <div className="menu-conta">
          <strong>{usuario.nome}</strong>
          <span>{usuario.perfil}</span>
          <button type="button" className="botao-sair" onClick={encerrarSessao}>Sair</button>
        </div>
      </aside>

      <div className="area-principal">
        <header className="barra-superior">
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
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
