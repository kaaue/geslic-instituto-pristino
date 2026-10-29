// Liga cada item do menu (config/navegacao.js) à tela que ele abre.
// Para proteger uma tela por perfil, passe `perfis` à RotaProtegida.

import RotaProtegida from './RotaProtegida.jsx';
import EquipamentosPage from '../pages/Equipamentos/EquipamentosPage.jsx';
import ProjetosPage from '../pages/Projetos/ProjetosPage.jsx';

const TELAS = {
  equipamentos: EquipamentosPage,
  projetos: ProjetosPage
};

export default function AppRoutes({ telaAtual }) {
  const Tela = TELAS[telaAtual];
  return (
    <RotaProtegida>
      <Tela />
    </RotaProtegida>
  );
}
