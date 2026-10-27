// Estrutura comum da interface do GESLIC: barra superior, navegação entre as
// funções básicas já implementadas e seleção do perfil de acesso.
//
// O perfil fica aqui até a RF_B9 trazer o login com conta individual. Ele é
// enviado à API em todas as requisições (api.js), e a API é quem decide o que
// cada perfil pode fazer (RN21).

import { useState } from 'react';
import TelaEquipamentos from './telas/TelaEquipamentos.jsx';
import TelaProjetos from './telas/TelaProjetos.jsx';
import { definirPerfil } from './api';

const TELAS = [
  { id: 'equipamentos', rotulo: 'Equipamentos', funcao: 'RF_B3' },
  { id: 'projetos', rotulo: 'Projetos', funcao: 'RF_B6' }
];

// Abre direto em uma tela quando o endereço tem #projetos ou #equipamentos
function telaInicial() {
  const hash = window.location.hash.replace('#', '');
  return TELAS.some((t) => t.id === hash) ? hash : 'equipamentos';
}

export default function App() {
  const [tela, setTela] = useState(telaInicial);
  const [perfil, setPerfil] = useState('administrador');

  function trocarTela(id) {
    setTela(id);
    window.location.hash = id;
  }

  function trocarPerfil(novo) {
    definirPerfil(novo);
    setPerfil(novo);
  }

  const atual = TELAS.find((t) => t.id === tela);

  return (
    <div className="aplicacao">
      <header className="barra-superior">
        <div>
          <h1>GESLIC</h1>
          <p>Sistema de Gestão de Licenças de Software e Apólices · Instituto Prístino</p>
        </div>
        <div className="barra-direita">
          <label className="seletor-perfil" title="Simula o perfil da conta até a RF_B9 trazer o login">
            <span>Perfil</span>
            <select value={perfil} onChange={(e) => trocarPerfil(e.target.value)}>
              <option value="administrador">Administrador</option>
              <option value="operador">Operador</option>
            </select>
          </label>
          <span className="identificacao-funcao">{atual.funcao} · Gerenciar {atual.rotulo.toLowerCase()}</span>
        </div>
      </header>

      <nav className="abas" aria-label="Funções básicas">
        {TELAS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tela ? 'aba aba-ativa' : 'aba'}
            onClick={() => trocarTela(t.id)}
          >
            {t.rotulo} <small>{t.funcao}</small>
          </button>
        ))}
      </nav>

      {tela === 'equipamentos' && <TelaEquipamentos />}
      {tela === 'projetos' && <TelaProjetos perfil={perfil} />}
    </div>
  );
}
