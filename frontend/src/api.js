// Funções que falam com a API. Ficam todas aqui para as telas não
// precisarem saber como a chamada é feita.

// Perfil escolhido na barra superior. Vai no cabeçalho X-Perfil de toda
// requisição até a RF_B9 trazer o login; quem aplica a regra é a API.
let perfilAtual = 'administrador';

export function definirPerfil(perfil) {
  perfilAtual = perfil;
}

async function requisicao(caminho, opcoes = {}) {
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

export function listarEquipamentos(filtros) {
  const parametros = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== '' && valor !== null && valor !== undefined) {
      parametros.append(chave, valor);
    }
  });
  const consulta = parametros.toString();
  return requisicao(`/api/equipamentos${consulta ? '?' + consulta : ''}`);
}

export function incluirEquipamento(dados) {
  return requisicao('/api/equipamentos', {
    method: 'POST',
    body: JSON.stringify(dados)
  });
}

export function alterarEquipamento(id, dados) {
  return requisicao(`/api/equipamentos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(dados)
  });
}

export function excluirEquipamento(id) {
  return requisicao(`/api/equipamentos/${id}`, { method: 'DELETE' });
}

export function previaInativacao(id) {
  return requisicao(`/api/equipamentos/${id}/previa-inativacao`);
}

export function listarSetores() {
  return requisicao('/api/setores');
}

export function listarColaboradores() {
  return requisicao('/api/colaboradores');
}

// ---------------------------------------------------------------
// RF_B6 - Gerenciar projetos institucionais
// ---------------------------------------------------------------

function consultaFiltros(filtros) {
  const parametros = new URLSearchParams();
  Object.entries(filtros).forEach(([chave, valor]) => {
    if (valor !== '' && valor !== null && valor !== undefined) {
      parametros.append(chave, valor);
    }
  });
  const consulta = parametros.toString();
  return consulta ? '?' + consulta : '';
}

export function listarProjetos(filtros) {
  return requisicao(`/api/projetos${consultaFiltros(filtros)}`);
}

export function listarFontesFinanciadoras() {
  return requisicao('/api/projetos/fontes');
}

export function incluirProjeto(dados) {
  return requisicao('/api/projetos', { method: 'POST', body: JSON.stringify(dados) });
}

export function alterarProjeto(id, dados) {
  return requisicao(`/api/projetos/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
}

export function excluirProjeto(id) {
  return requisicao(`/api/projetos/${id}`, { method: 'DELETE' });
}

export function encerrarProjeto(id, dataEncerramento) {
  return requisicao(`/api/projetos/${id}/encerramento`, {
    method: 'POST',
    body: JSON.stringify({ data_encerramento: dataEncerramento })
  });
}

export function prorrogarProjeto(id, novoTermino) {
  return requisicao(`/api/projetos/${id}/prorrogacao`, {
    method: 'POST',
    body: JSON.stringify({ data_fim_prevista: novoTermino })
  });
}
