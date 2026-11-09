// Faixa de retorno de uma operação (sucesso ou erro). Usada com o hook useMensagem.

export default function Mensagem({ mensagem }) {
  if (!mensagem) return null;
  return <div className={`mensagem mensagem-${mensagem.tipo}`}>{mensagem.texto}</div>;
}
