// Faixa mostrada no cadastro aberto pelo "Abrir cadastro" de uma solicitação
// de ajuste (RF_B10): lembra de qual solicitação é a correção e, enquanto a
// tela está aberta, mantém a presença "atualizando" para os demais
// Administradores (RN42, informativa: não bloqueia ninguém).

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { marcarPresenca, sairDaPresenca } from '../../services/solicitacaoService';

const INTERVALO_MS = 20000;

export default function FaixaCorrecao({ idSolicitacao }) {
  const { pode } = useAuth();
  const podeConcluir = pode('ajuste.concluir');

  useEffect(() => {
    if (!idSolicitacao || !podeConcluir) return undefined;
    const avisar = () => marcarPresenca(idSolicitacao, 'atualizando').catch(() => {});
    avisar();
    const temporizador = setInterval(avisar, INTERVALO_MS);
    return () => {
      clearInterval(temporizador);
      sairDaPresenca(idSolicitacao).catch(() => {});
    };
  }, [idSolicitacao, podeConcluir]);

  if (!idSolicitacao || !podeConcluir) return null;
  const codigo = `SA-${String(idSolicitacao).padStart(3, '0')}`;
  return (
    <p className="aviso-info" style={{ marginBottom: 14 }}>
      Correção da solicitação <strong>{codigo}</strong>: salve a correção no cadastro e depois{' '}
      <Link to="/">volte ao painel</Link> para marcar a solicitação como concluída. A conclusão não substitui a correção.
    </p>
  );
}
