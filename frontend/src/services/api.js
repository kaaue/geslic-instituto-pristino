// Cliente HTTP comum a todos os serviços. As telas não chamam fetch direto:
// usam os serviços de cada recurso, que passam por aqui.
//
// A sessão vive num cookie HttpOnly definido pela API no login: o navegador
// o envia sozinho, e o JavaScript da página nunca vê o token. Perfil e
// permissões vêm do servidor (GET /api/auth/me); nada aqui define privilégio.

// Eventos que o AuthContext escuta
export const EVENTO_SESSAO_ENCERRADA = 'geslic:sessao-encerrada';
export const EVENTO_TROCA_SENHA = 'geslic:troca-senha';

// Rotas em que 401 é resposta esperada, e não sessão perdida
const SEM_AVISO_DE_SESSAO = ['/api/auth/login', '/api/auth/me'];

export async function requisicao(caminho, opcoes = {}) {
  let resposta;
  try {
    resposta = await fetch(caminho, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...opcoes
    });
  } catch {
    const erro = new Error('Não foi possível falar com a API. Verifique se ela está no ar.');
    erro.corpo = { mensagem: erro.message };
    erro.status = 0;
    throw erro;
  }

  // 204 não tem corpo; respostas fora do padrão viram corpo vazio
  const texto = resposta.status === 204 ? '' : await resposta.text();
  let corpo = null;
  try {
    corpo = texto ? JSON.parse(texto) : null;
  } catch {
    corpo = null;
  }

  if (!resposta.ok) {
    // 401: sessão ausente, vencida ou encerrada no servidor -> volta ao login.
    // 403: a sessão vale, mas falta permissão -> a tela mostra a mensagem.
    if (resposta.status === 401 && !SEM_AVISO_DE_SESSAO.includes(caminho)) {
      window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_ENCERRADA, { detail: corpo?.mensagem }));
    }
    if (resposta.status === 403 && corpo?.codigo === 'TROCA_SENHA_OBRIGATORIA') {
      window.dispatchEvent(new Event(EVENTO_TROCA_SENHA));
    }
    // O erro carrega o corpo, para a tela saber se foram erros de campo
    // (erros) ou uma mensagem geral (mensagem).
    const erro = new Error(corpo?.mensagem || 'Falha na requisição');
    erro.corpo = corpo || {};
    erro.status = resposta.status;
    throw erro;
  }

  return corpo;
}

// Monta a query string só com os filtros preenchidos
export function consultaFiltros(filtros) {
  const parametros = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== '' && valor !== null && valor !== undefined) {
      parametros.append(chave, valor);
    }
  });
  const consulta = parametros.toString();
  return consulta ? '?' + consulta : '';
}

export function enviarJson(metodo, dados) {
  return { method: metodo, body: JSON.stringify(dados ?? {}) };
}

// Mensagem de erro para mostrar ao usuário
export function mensagemDeErro(erro, padrao = 'Não foi possível concluir a operação.') {
  return erro?.corpo?.mensagem || padrao;
}

// Operações padrão de um cadastro: listar, buscar, incluir, alterar,
// inativar e excluir. Usada pelos serviços das funções básicas.
export function servicoDeCadastro(base, acaoInativar = 'inativacao') {
  return {
    listar: (filtros = {}) => requisicao(`${base}${consultaFiltros(filtros)}`),
    buscar: (id) => requisicao(`${base}/${id}`),
    incluir: (dados) => requisicao(base, enviarJson('POST', dados)),
    alterar: (id, dados) => requisicao(`${base}/${id}`, enviarJson('PUT', dados)),
    inativar: (id) => requisicao(`${base}/${id}/${acaoInativar}`, { method: 'POST' }),
    excluir: (id) => requisicao(`${base}/${id}`, { method: 'DELETE' })
  };
}
