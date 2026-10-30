// Minha conta e preferências de aviso (Protótipo 4; RF_B9 e RF_B10).
// Cada pessoa consulta a própria conta, atualiza nome e e-mail e troca a
// senha após confirmar a atual. Com senha provisória, esta é a única tela
// liberada até a troca. As preferências de aviso (RF_B10) estão em
// desenvolvimento.

import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import Campo from '../../components/common/Campo.jsx';
import CampoSenha from '../../components/common/CampoSenha.jsx';
import Mensagem from '../../components/common/Mensagem.jsx';
import useMensagem from '../../hooks/useMensagem';
import { atualizarMeusDados, alterarMinhaSenha } from '../../services/contaService';
import { mensagemDeErro } from '../../services/api';
import { errosDeSenha } from '../../utils/senha';

const SENHA_VAZIA = { senha_atual: '', senha: '', confirmacao: '' };

function dataHora(iso) {
  if (!iso) return 'primeiro acesso';
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function MinhaContaPage() {
  const { usuario, atualizarUsuario, trocaSenhaObrigatoria } = useAuth();
  const [dados, setDados] = useState({ nome: usuario.nome, email: usuario.email });
  const [errosDados, setErrosDados] = useState({});
  const [senha, setSenha] = useState(SENHA_VAZIA);
  const [errosSenha, setErrosSenha] = useState({});
  const [salvando, setSalvando] = useState('');
  const [mensagem, mostrarMensagem] = useMensagem(6000);

  async function salvarDados(evento) {
    evento.preventDefault();
    setSalvando('dados');
    setErrosDados({});
    try {
      const { usuario: conta } = await atualizarMeusDados(dados);
      atualizarUsuario(conta);
      mostrarMensagem('sucesso', 'Dados atualizados.');
    } catch (e) {
      setErrosDados(e.corpo?.erros || {});
      if (!e.corpo?.erros) mostrarMensagem('erro', mensagemDeErro(e));
    } finally {
      setSalvando('');
    }
  }

  async function salvarSenha(evento) {
    evento.preventDefault();
    const erros = errosDeSenha(senha.senha, senha.confirmacao);
    if (!senha.senha_atual) erros.senha_atual = 'Informe a senha atual.';
    setErrosSenha(erros);
    if (Object.keys(erros).length) return;

    setSalvando('senha');
    try {
      const resposta = await alterarMinhaSenha(senha);
      atualizarUsuario(resposta.usuario);
      setSenha(SENHA_VAZIA);
      mostrarMensagem('sucesso', resposta.mensagem);
    } catch (e) {
      setErrosSenha(e.corpo?.erros || {});
      if (!e.corpo?.erros) mostrarMensagem('erro', mensagemDeErro(e));
    } finally {
      setSalvando('');
    }
  }

  return (
    <main className="conteudo">
      <div className="titulo-area">
        <div>
          <h2>Minha conta</h2>
          <p className="subtitulo">RF_B9 e RF_B10 · Protótipo 4 da ERS</p>
        </div>
      </div>

      {trocaSenhaObrigatoria && (
        <div className="mensagem mensagem-aviso" role="alert">
          Você entrou com uma senha provisória. Escolha uma nova senha para continuar usando o sistema.
        </div>
      )}
      <Mensagem mensagem={mensagem} />

      <div className="grade-duas">
        <section className="cartao">
          <h3>Conta</h3>
          <dl className="dados-conta">
            <dt>Login</dt><dd>{usuario.login}</dd>
            <dt>Perfil</dt><dd>{usuario.perfil}</dd>
            <dt>Colaborador vinculado</dt><dd>{usuario.nome_colaborador || 'nenhum'}</dd>
            <dt>Último acesso</dt><dd>{dataHora(usuario.ultimo_acesso_em)}</dd>
          </dl>
          <p className="nota">Login, perfil e vínculo com colaborador são alterados por um Administrador.</p>

          {!trocaSenhaObrigatoria && (
            <form className="formulario-cartao" onSubmit={salvarDados} noValidate>
              <Campo rotulo="Nome" erro={errosDados.nome}>
                <input type="text" value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                  className={errosDados.nome ? 'com-erro' : ''} />
              </Campo>
              <Campo rotulo="E-mail" erro={errosDados.email} dica="Usado para recuperar a senha.">
                <input type="email" value={dados.email} onChange={(e) => setDados({ ...dados, email: e.target.value })}
                  className={errosDados.email ? 'com-erro' : ''} />
              </Campo>
              <button type="submit" className="botao-principal" disabled={salvando === 'dados'}>
                {salvando === 'dados' ? 'Salvando...' : 'Salvar dados'}
              </button>
            </form>
          )}
        </section>

        <section className="cartao">
          <h3>Alterar senha</h3>
          <form className="formulario-cartao" onSubmit={salvarSenha} noValidate>
            <Campo rotulo={trocaSenhaObrigatoria ? 'Senha provisória' : 'Senha atual'} erro={errosSenha.senha_atual}>
              <input type="password" value={senha.senha_atual} autoComplete="current-password"
                onChange={(e) => setSenha({ ...senha, senha_atual: e.target.value })}
                className={errosSenha.senha_atual ? 'com-erro' : ''} />
            </Campo>
            <CampoSenha rotulo="Nova senha" valor={senha.senha} aoMudar={(v) => setSenha({ ...senha, senha: v })} erro={errosSenha.senha} />
            <CampoSenha rotulo="Confirmação da nova senha" valor={senha.confirmacao} comRequisitos={false}
              aoMudar={(v) => setSenha({ ...senha, confirmacao: v })} erro={errosSenha.confirmacao} />
            <p className="nota">Ao trocar a senha, as outras sessões abertas da sua conta são encerradas.</p>
            <button type="submit" className="botao-principal" disabled={salvando === 'senha'}>
              {salvando === 'senha' ? 'Salvando...' : 'Alterar senha'}
            </button>
          </form>
        </section>
      </div>

      {!trocaSenhaObrigatoria && (
        <div className="aviso-desenvolvimento" role="status">
          <strong>Preferências de aviso (RF_B10) em desenvolvimento</strong>
          <p>
            Aqui você vai escolher com quantos meses de antecedência quer ser avisado dos vencimentos
            (padrões: seis meses e um mês). A API dessa função ainda responde 501.
          </p>
        </div>
      )}
    </main>
  );
}
