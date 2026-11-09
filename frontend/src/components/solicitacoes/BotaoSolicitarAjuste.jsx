// Atalho "Solicitar ajuste" nos cadastros (RF_B10): para o Operador, que não
// corrige dados cadastrais, abre a solicitação já com o registro escolhido.
// Não aparece para quem não emite solicitações (o Administrador corrige direto).

import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import ModalSolicitacaoAjuste from './ModalSolicitacaoAjuste.jsx';

export default function BotaoSolicitarAjuste({
  entidade, idRegistro, rotulo, texto = 'Solicitar ajuste', className = 'botao-texto', aoEmitida
}) {
  const { pode } = useAuth();
  const [aberto, setAberto] = useState(false);
  if (!pode('ajuste.solicitar')) return null;

  return (
    <>
      <button type="button" className={className} onClick={() => setAberto(true)}>{texto}</button>
      {aberto && (
        <ModalSolicitacaoAjuste
          inicial={{ entidade, id_registro: idRegistro, rotulo }}
          aoFechar={() => setAberto(false)}
          aoEmitida={(solicitacao) => {
            setAberto(false);
            aoEmitida?.(solicitacao);
          }}
        />
      )}
    </>
  );
}
