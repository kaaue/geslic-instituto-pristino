// Esqueci minha senha: pede o link de redefinição por e-mail. A resposta é a
// mesma exista ou não a conta, para não revelar quais e-mails são cadastrados.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import PaginaAutenticacao from '../../components/common/PaginaAutenticacao.jsx';
import Campo from '../../components/common/Campo.jsx';
import { solicitarRecuperacao } from '../../services/authService';
import { mensagemDeErro } from '../../services/api';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [erroCampo, setErroCampo] = useState('');
  const [erro, setErro] = useState('');
  const [resposta, setResposta] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    setErro('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErroCampo('Informe o e-mail da sua conta.');
      return;
    }
    setErroCampo('');
    setEnviando(true);
    try {
      const { mensagem } = await solicitarRecuperacao(email.trim());
      setResposta(mensagem);
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível enviar o pedido.'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PaginaAutenticacao
      titulo="Esqueci minha senha"
      subtitulo="Informe o e-mail da sua conta. Se ela estiver ativa, enviaremos um link para escolher uma nova senha."
    >
      {erro && <div className="mensagem mensagem-erro" role="alert">{erro}</div>}
      {resposta ? (
        <>
          <div className="mensagem mensagem-sucesso" role="status">{resposta}</div>
          <p className="nota">O link vale por pouco tempo e só pode ser usado uma vez.</p>
        </>
      ) : (
        <form className="formulario-autenticacao" onSubmit={enviar} noValidate>
          <Campo rotulo="E-mail" erro={erroCampo}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              className={erroCampo ? 'com-erro' : ''}
            />
          </Campo>
          <button type="submit" className="botao-principal" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar link'}
          </button>
        </form>
      )}
      <div className="links-autenticacao">
        <Link to="/login">Voltar para o login</Link>
      </div>
    </PaginaAutenticacao>
  );
}
