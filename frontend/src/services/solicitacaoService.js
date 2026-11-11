// RF_B10 Gerenciar solicitações de ajuste cadastral (pelo painel e pelos atalhos nos cadastros)

import { requisicao, enviarJson, consultaFiltros } from './api';

export const tiposDeCadastro = () => requisicao('/api/solicitacoes-ajuste/entidades');
export const opcoesDoCadastro = (entidade) => requisicao(`/api/solicitacoes-ajuste/opcoes${consultaFiltros({ entidade })}`);
// O painel se atualiza sozinho: a consulta automática não prolonga a sessão (RN32)
export const consultarPainel = (pagina = 1, automatica = false) =>
  requisicao(`/api/solicitacoes-ajuste/painel${consultaFiltros({ pagina })}`, { automatica });
export const detalhar = (id, automatica = false) => requisicao(`/api/solicitacoes-ajuste/${id}`, { automatica });
export const emitir = (dados) => requisicao('/api/solicitacoes-ajuste', enviarJson('POST', dados));
export const concluir = (id, observacao) => requisicao(`/api/solicitacoes-ajuste/${id}/conclusao`, enviarJson('POST', { observacao }));
// Presença informativa (RN42), renovada enquanto o detalhe está aberto
export const marcarPresenca = (id, acao) =>
  requisicao(`/api/solicitacoes-ajuste/${id}/presenca`, { ...enviarJson('PUT', { acao }), automatica: true });
export const sairDaPresenca = (id) =>
  requisicao(`/api/solicitacoes-ajuste/${id}/presenca`, { method: 'DELETE', automatica: true });
