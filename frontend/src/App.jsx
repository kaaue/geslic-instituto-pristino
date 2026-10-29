// Raiz da interface do GESLIC: estado de autenticação, estrutura comum e a
// tela aberta. Abre direto em uma tela quando o endereço tem #projetos ou
// #equipamentos.

import { AuthProvider } from './context/AuthContext.jsx';
import Layout from './components/layout/Layout.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import useHashRoute from './hooks/useHashRoute';
import { MENU, TELA_INICIAL } from './config/navegacao';

const IDS = MENU.map((item) => item.id);

export default function App() {
  const [tela, navegar] = useHashRoute(IDS, TELA_INICIAL);

  return (
    <AuthProvider>
      <Layout telaAtual={tela} aoNavegar={navegar}>
        <AppRoutes telaAtual={tela} />
      </Layout>
    </AuthProvider>
  );
}
