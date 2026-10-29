// Barra superior: nome do sistema, seletor de perfil e a função básica aberta.

import useAuth from '../../hooks/useAuth';
import { PERFIS } from '../../context/AuthContext.jsx';

export default function BarraSuperior({ itemAtual }) {
  const { perfil, trocarPerfil } = useAuth();

  return (
    <header className="barra-superior">
      <div>
        <h1>GESLIC</h1>
        <p>Sistema de Gestão de Licenças de Software e Apólices · Instituto Prístino</p>
      </div>
      <div className="barra-direita">
        <label className="seletor-perfil" title="Simula o perfil da conta até a RF_B9 trazer o login">
          <span>Perfil</span>
          <select value={perfil} onChange={(e) => trocarPerfil(e.target.value)}>
            {PERFIS.map((p) => (
              <option key={p.id} value={p.id}>{p.rotulo}</option>
            ))}
          </select>
        </label>
        <span className="identificacao-funcao">
          {itemAtual.funcao} · Gerenciar {itemAtual.rotulo.toLowerCase()}
        </span>
      </div>
    </header>
  );
}
