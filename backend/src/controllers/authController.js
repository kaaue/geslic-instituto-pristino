// Controller de autenticação (seção 2.3.2 da ERS e RF_B9): login, logout,
// conta atual, solicitação de acesso e recuperação de senha. Todas as rotas
// aqui são públicas, exceto /me e /logout.

const { comTransacao } = require('../config/database');
const { frontendUrl, recuperacao } = require('../config/env');
const AppError = require('../utils/AppError');
const { lancarSeHouverErros } = require('../utils/AppError');
const { verificarSenhaOuFicticio } = require('../utils/senha');
const { gravarCookieSessao, apagarCookieSessao } = require('../utils/cookies');
const email = require('../utils/email');
const limites = require('../middlewares/limiteTentativas');
const Usuario = require('../models/usuarioModel');
const Sessao = require('../models/sessaoModel');
const Recuperacao = require('../models/recuperacaoModel');
const {
  normalizarLogin, normalizarEmail, validarSolicitacao, validarNovaSenha
} = require('../models/usuarioValidacao');

// Mesma mensagem para login inexistente e senha errada: não revela quais contas existem
const CREDENCIAIS_INVALIDAS = 'Login ou senha inválidos.';

async function login(req, res) {
  const identificador = normalizarLogin(req.body?.login);
  const senha = typeof req.body?.senha === 'string' ? req.body.senha : '';
  if (!identificador || !senha) {
    throw AppError.campos({
      ...(!identificador && { login: 'Informe o login ou e-mail.' }),
      ...(!senha && { senha: 'Informe a senha.' })
    });
  }

  const chaveConta = identificador;
  const chaveIp = req.ip;
  if (limites.loginPorConta.excedido(chaveConta) || limites.loginPorIp.excedido(chaveIp)) {
    throw AppError.muitasTentativas('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
  }

  const conta = await Usuario.buscarParaLogin(identificador);
  if (!verificarSenhaOuFicticio(senha, conta?.senha_hash)) {
    limites.loginPorConta.registrar(chaveConta);
    limites.loginPorIp.registrar(chaveIp);
    throw AppError.naoAutenticado(CREDENCIAIS_INVALIDAS, 'CREDENCIAIS_INVALIDAS');
  }
  limites.loginPorConta.limpar(chaveConta);

  // A situação só é revelada a quem acertou a senha
  if (conta.situacao === 'pendente') {
    throw AppError.proibido('Sua solicitação de acesso ainda aguarda a aprovação de um Administrador.', 'CONTA_PENDENTE');
  }
  if (conta.situacao !== 'ativo') {
    throw AppError.proibido('Esta conta está desativada. Procure um Administrador.', 'CONTA_INATIVA');
  }

  const token = await comTransacao(async (conexao) => {
    await Usuario.registrarAcesso(conexao, conta.id_usuario);
    return Sessao.criar(conexao, conta.id_usuario);
  });
  gravarCookieSessao(res, token);
  res.json({ usuario: await Usuario.carregarAutenticado(conta.id_usuario) });
}

async function logout(req, res) {
  await Sessao.encerrar(req.sessao.idSessao, 'logout');
  apagarCookieSessao(res);
  res.json({ encerrada: true });
}

// Conta da sessão, com perfil e permissões atuais (vindos do banco)
async function me(req, res) {
  res.json({ usuario: req.usuario });
}

// Autocadastro: a conta nasce pendente e sem acesso até a aprovação
async function solicitarCadastro(req, res) {
  const { erros, dados } = validarSolicitacao(req.body || {});
  lancarSeHouverErros(erros);
  await Usuario.solicitarCadastro(dados);
  res.status(201).json({
    mensagem: 'Solicitação enviada. Você poderá entrar assim que um Administrador aprovar o acesso.'
  });
}

// Resposta igual exista ou não a conta, para não revelar quais e-mails estão cadastrados
const RESPOSTA_RECUPERACAO =
  'Se houver uma conta ativa com esse e-mail, enviaremos um link para redefinir a senha. ' +
  'Confira também a caixa de spam.';

async function solicitarRecuperacao(req, res) {
  if (!email.disponivel()) {
    throw new AppError(
      'A recuperação de senha por e-mail não está configurada neste servidor. ' +
      'Peça a um Administrador uma senha provisória.', 503, null, 'EMAIL_INDISPONIVEL');
  }
  const endereco = normalizarEmail(req.body?.email);
  if (!endereco) throw AppError.campos({ email: 'Informe o e-mail da conta.' });

  if (limites.recuperacaoPorIp.excedido(req.ip)) {
    throw AppError.muitasTentativas('Muitos pedidos de recuperação. Aguarde alguns minutos e tente novamente.');
  }
  limites.recuperacaoPorIp.registrar(req.ip);

  // Por e-mail, o limite é silencioso: a resposta continua a mesma
  if (!limites.recuperacaoPorEmail.excedido(endereco)) {
    limites.recuperacaoPorEmail.registrar(endereco);
    const conta = await Recuperacao.contaAtivaPorEmail(endereco);
    if (conta) {
      const token = await Recuperacao.criarPedido(conta.id_usuario);
      // O token vai depois do #: não aparece em registros de servidor nem no Referer
      const link = `${frontendUrl}/redefinir-senha#token=${token}`;
      try {
        await email.enviar({
          para: conta.email,
          assunto: 'GESLIC - redefinição de senha',
          texto:
            `Olá, ${conta.nome}.\n\n` +
            `Recebemos um pedido para redefinir a senha da conta "${conta.login}" no GESLIC.\n` +
            `Para escolher uma nova senha, abra o link abaixo em até ${recuperacao.validadeMinutos} minutos:\n\n` +
            `${link}\n\n` +
            'O link só pode ser usado uma vez. Se você não fez o pedido, ignore esta mensagem: ' +
            'sua senha continua a mesma.\n'
        });
      } catch (erro) {
        // Falha registrada só no servidor; a resposta não revela se a conta existe
        console.error(`Falha ao enviar o e-mail de recuperação: ${erro.message}`);
      }
    }
  }
  res.json({ mensagem: RESPOSTA_RECUPERACAO });
}

async function redefinirSenha(req, res) {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  if (!token) throw new AppError('Link de redefinição ausente. Abra o link recebido por e-mail.', 400, null, 'TOKEN_INVALIDO');
  const erros = {};
  validarNovaSenha(req.body.senha, req.body.confirmacao, erros);
  lancarSeHouverErros(erros);
  await Recuperacao.redefinir(token, req.body.senha);
  res.json({ mensagem: 'Senha redefinida. Entre com a nova senha.' });
}

module.exports = { login, logout, me, solicitarCadastro, solicitarRecuperacao, redefinirSenha };
