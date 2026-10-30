// Tela inicial depois do login. Mostra a conta, o perfil e atalhos só para
// as telas que a conta pode abrir. Os indicadores do painel de
// acompanhamento (RF_S1) estão em desenvolvimento: nenhum número é simulado.

import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { menuDaConta } from '../../config/navegacao';

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

const DESCRICAO_PERFIL = {
  Administrador: 'Realiza tudo o que o Operador realiza e, exclusivamente, altera e exclui dados cadastrais, gerencia as contas e permissões e consulta o histórico.',
  Operador: 'Inclui cadastros, registra licenças e apólices, realiza movimentações, renovações, inativações e encerramentos e confirma exceções autorizadas.'
};

export default function InicioPage() {
  const { usuario, pode } = useAuth();
  const atalhos = menuDaConta(pode).flatMap((g) => g.itens).filter((i) => i.caminho !== '/');

  return (
    <main className="conteudo">
      <div className="titulo-area">
        <div>
          <h2>Painel de acompanhamento</h2>
          <p className="subtitulo">
            {saudacao()}, {usuario.nome.split(' ')[0]}. Perfil <strong>{usuario.perfil}</strong>
            {usuario.nome_colaborador ? ` · colaborador vinculado: ${usuario.nome_colaborador}` : ''}
          </p>
        </div>
      </div>

      <section className="cartao">
        <h3>O que o seu perfil faz</h3>
        <p>{DESCRICAO_PERFIL[usuario.perfil] || 'Permissões definidas pelo Administrador.'}</p>
      </section>

      <section className="cartao">
        <h3>Atalhos</h3>
        <div className="atalhos">
          {atalhos.map((item) => (
            <Link key={item.caminho} to={item.caminho} className="atalho">
              <strong>{item.rotulo}</strong>
              <span>{item.funcao}{item.pendente ? ' · em desenvolvimento' : ''}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="aviso-desenvolvimento" role="status">
        <strong>Painel de acompanhamento (RF_S1) em desenvolvimento</strong>
        <p>
          Os indicadores de instâncias contratadas, em uso e vagas, as apólices por situação e os
          vencimentos dependem das funções de licenças e apólices, ainda não implementadas.
        </p>
      </div>
    </main>
  );
}
