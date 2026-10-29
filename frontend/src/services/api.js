// Cliente HTTP comum a todos os serviços. As telas não chamam fetch direto:
// usam os serviços de cada recurso (equipamentoService, projetoService...),
// que passam por aqui.

// Perfil escolhido na barra superior. Vai no cabeçalho X-Perfil de toda
// requisição até a RF_B9 trazer o login; quem aplica a regra é a API.
// Quem atualiza este valor é o AuthContext.
let perfilAtual = 'administrador';

export function definirPerfil(perfil) {
  perfilAtual = perfil;
}

export async function requisicao(caminho, opcoes = {}) {
  const resposta = await fetch(caminho, {
    headers: { 'Content-Type': 'application/json', 'X-Perfil': perfilAtual },
    ...opcoes
  });

  // 204 não tem corpo
  const corpo = resposta.status === 204 ? null : await resposta.json();

  if (!resposta.ok) {
    // Devolvo um erro que carrega o corpo, para a tela saber se foram
    // erros de campo (erros) ou uma mensagem geral (mensagem).
    const erro = new Error(corpo?.mensagem || 'Falha na requisição');
    erro.corpo = corpo;
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
  return { method: metodo, body: JSON.stringify(dados) };
}
