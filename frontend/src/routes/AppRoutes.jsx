// Rotas da interface.
//   Públicas: login, solicitação de acesso, esqueci e redefinir senha.
//   Protegidas: todas as outras, dentro do Layout, cada uma conferida por
//   ExigePermissao com a permissão de config/navegacao.js.
//   Caminho inexistente: tela "Página não encontrada".

import { Route, Routes } from 'react-router-dom';
import RotaPublica from './RotaPublica.jsx';
import RotaProtegida from './RotaProtegida.jsx';
import ExigePermissao from './ExigePermissao.jsx';
import Layout from '../components/layout/Layout.jsx';

import LoginPage from '../pages/Login/LoginPage.jsx';
import SolicitarAcessoPage from '../pages/SolicitarAcesso/SolicitarAcessoPage.jsx';
import EsqueciSenhaPage from '../pages/EsqueciSenha/EsqueciSenhaPage.jsx';
import RedefinirSenhaPage from '../pages/RedefinirSenha/RedefinirSenhaPage.jsx';
import NaoEncontradaPage from '../pages/NaoEncontrada/NaoEncontradaPage.jsx';

import InicioPage from '../pages/Inicio/InicioPage.jsx';
import LicencasPage from '../pages/Licencas/LicencasPage.jsx';
import ApolicesPage from '../pages/Apolices/ApolicesPage.jsx';
import EquipamentosPage from '../pages/Equipamentos/EquipamentosPage.jsx';
import ProjetosPage from '../pages/Projetos/ProjetosPage.jsx';
import ColaboradoresPage from '../pages/Colaboradores/ColaboradoresPage.jsx';
import SetoresPage from '../pages/Setores/SetoresPage.jsx';
import SoftwaresPage from '../pages/Softwares/SoftwaresPage.jsx';
import FornecedoresPage from '../pages/Fornecedores/FornecedoresPage.jsx';
import BensSeguraveisPage from '../pages/BensSeguraveis/BensSeguraveisPage.jsx';
import TiposSeguroPage from '../pages/TiposSeguro/TiposSeguroPage.jsx';
import RelatoriosPage from '../pages/Relatorios/RelatoriosPage.jsx';
import HistoricoPage from '../pages/Historico/HistoricoPage.jsx';
import ContasPage from '../pages/Contas/ContasPage.jsx';
import NotificacoesPage from '../pages/Notificacoes/NotificacoesPage.jsx';
import MinhaContaPage from '../pages/MinhaConta/MinhaContaPage.jsx';

// caminho -> tela; a permissão de cada caminho está em config/navegacao.js
const TELAS = {
  '/': InicioPage,
  '/licencas': LicencasPage,
  '/apolices': ApolicesPage,
  '/equipamentos': EquipamentosPage,
  '/projetos': ProjetosPage,
  '/colaboradores': ColaboradoresPage,
  '/setores': SetoresPage,
  '/softwares': SoftwaresPage,
  '/fornecedores': FornecedoresPage,
  '/bens-seguraveis': BensSeguraveisPage,
  '/tipos-seguro': TiposSeguroPage,
  '/relatorios': RelatoriosPage,
  '/historico': HistoricoPage,
  '/contas': ContasPage,
  '/notificacoes': NotificacoesPage,
  '/minha-conta': MinhaContaPage
};

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<RotaPublica />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/solicitar-acesso" element={<SolicitarAcessoPage />} />
        <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
      </Route>
      {/* Aberta mesmo com sessão: o link do e-mail pode ser aberto em qualquer situação */}
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />

      <Route element={<RotaProtegida />}>
        <Route element={<Layout />}>
          {Object.entries(TELAS).map(([caminho, Tela]) => (
            <Route
              key={caminho}
              path={caminho}
              element={<ExigePermissao caminho={caminho}><Tela /></ExigePermissao>}
            />
          ))}
          <Route path="*" element={<NaoEncontradaPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
