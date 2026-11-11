// Minha conta e preferências de notificação (Protótipo 4; RF_B8 e RF_B9).
// Dados da conta e troca de senha num único bloco: o e-mail é do domínio
// @pristino.org.br, a nova senha mostra os critérios e a confirmação diz se
// as senhas coincidem. Não há "último acesso" (RN41). À direita, as
// preferências por tipo de aviso. Com senha provisória, esta é a única tela
// liberada, e só a troca de senha fica disponível.

import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import Campo from '../../components/common/Campo.jsx';
import CampoSenha from '../../components/common/CampoSenha.jsx';
import Mensagem from '../../components/common/Mensagem.jsx';
import useMensagem from '../../hooks/useMensagem';
import PreferenciasNotificacao from './PreferenciasNotificacao.jsx';
import { atualizarMinhaConta, alterarMinhaSenha } from '../../services/contaService';
import { mensagemDeErro } from '../../services/api';
import { errosDeSenha } from '../../utils/senha';

const SENHA_VAZIA = { senha_atual: '', senha: '', confirmacao: '' };
const DOMINIO = '@pristino.org.br';

export default function MinhaContaPage() {
  const { usuario, atualizarUsuario, trocaSenhaObrigatoria } = useAuth();
  const [dados, setDados] = useState({ nome: usuario.nome, email: usuario.email });
  const [senha, setSenha] = useState(SENHA_VAZIA);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [mensagem, mostrarMensagem] = useMensagem(6000);

  const trocandoSenha = Boolean(senha.senha_atual || senha.senha || senha.confirmacao);
  const coincidem = senha.confirmacao && senha.senha === senha.confirmacao;

  async function salvar(evento) {
    evento.preventDefault();
    const novos = {};
    if (!trocaSenhaObrigatoria && dados.email && !dados.email.trim().toLowerCase().endsWith(DOMINIO)) {
      novos.email = `Use o e-mail institucional (${DOMINIO}).`;
    }
    if (trocandoSenha || trocaSenhaObrigatoria) {
      Object.assign(novos, errosDeSenha(senha.senha, senha.confirmacao));
      if (!senha.senha_atual) novos.senha_atual = 'Informe a senha atual.';
    }
    setErros(novos);
    if (Object.keys(novos).length) return;

    setSalvando(true);
    try {
      const resposta = trocaSenhaObrigatoria
        ? await alterarMinhaSenha(senha)
        : await atualizarMinhaConta({ ...dados, ...(trocandoSenha ? senha : {}) });
      atualizarUsuario(resposta.usuario);
      setSenha(SENHA_VAZIA);
      mostrarMensagem('sucesso', resposta.mensagem);
    } catch (e) {
      setErros(e.corpo?.erros || {});
      if (!e.corpo?.erros) mostrarMensagem('erro', mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="conteudo">
      <div className="titulo-area">
        <div>
          <h2>Minha conta</h2>
          <p className="subtitulo-pagina">Dados da conta, senha e notificações que você deseja receber.</p>
        </div>
      </div>

      {trocaSenhaObrigatoria && (
        <div className="mensagem mensagem-aviso" role="alert">
          Você entrou com uma senha provisória. Escolha uma nova senha para continuar usando o sistema.
        </div>
      )}
      <Mensagem mensagem={mensagem} />

      <div className="grade-conta">
        <section className="cartao">
          <h3>Conta e senha</h3>
          <dl className="dados-conta">
            <dt>Login</dt><dd>{usuario.login}</dd>
            <dt>Perfil</dt><dd>{usuario.perfil}</dd>
            <dt>Colaborador</dt><dd>{usuario.nome_colaborador || 'nenhum vinculado'}</dd>
          </dl>

          <form className="formulario-cartao" onSubmit={salvar} noValidate>
            {!trocaSenhaObrigatoria && (
              <>
                <Campo rotulo="Nome" erro={erros.nome}>
                  <input type="text" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                    className={erros.nome ? 'com-erro' : ''} />
                </Campo>
                <Campo rotulo="E-mail institucional" erro={erros.email} dica={`Obrigatório o domínio ${DOMINIO}. Usado para recuperar a senha.`}>
                  <input type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })}
                    className={erros.email ? 'com-erro' : ''} />
                </Campo>
              </>
            )}
            <Campo rotulo={trocaSenhaObrigatoria ? 'Senha provisória' : 'Senha atual'} erro={erros.senha_atual}
              dica={trocaSenhaObrigatoria ? null : 'Preencha só se for trocar a senha.'}>
              <input type="password" value={senha.senha_atual} autoComplete="current-password"
                onChange={(e) => setSenha({ ...senha, senha_atual: e.target.value })}
                className={erros.senha_atual ? 'com-erro' : ''} />
            </Campo>
            <CampoSenha rotulo="Nova senha" valor={senha.senha} aoMudar={(v) => setSenha({ ...senha, senha: v })} erro={erros.senha} />
            <Campo rotulo="Confirme a nova senha" erro={erros.confirmacao}
              dica={senha.confirmacao ? (coincidem ? '✓ As senhas coincidem' : 'As senhas ainda não coincidem') : null}>
              <input type="password" value={senha.confirmacao} autoComplete="new-password"
                onChange={(e) => setSenha({ ...senha, confirmacao: e.target.value })}
                className={erros.confirmacao ? 'com-erro' : ''} />
            </Campo>
            {(trocandoSenha || trocaSenhaObrigatoria) && (
              <p className="nota">Ao trocar a senha, as outras sessões abertas da sua conta são encerradas.</p>
            )}
            <button type="submit" className="botao-principal" disabled={salvando}>
              {salvando ? 'Salvando...' : trocaSenhaObrigatoria ? 'Trocar senha' : 'Salvar conta e senha'}
            </button>
          </form>
        </section>

        {!trocaSenhaObrigatoria && <PreferenciasNotificacao mostrarMensagem={mostrarMensagem} />}
      </div>
    </main>
  );
}
