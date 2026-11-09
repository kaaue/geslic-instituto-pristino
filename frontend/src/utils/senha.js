// Regras de senha nova, iguais às da API (backend/src/utils/senha.js).
// Exibidas como lista de conferência abaixo do campo.

export const REGRAS_SENHA = [
  { texto: 'Pelo menos 8 caracteres', ok: (s) => s.length >= 8 },
  { texto: 'Uma letra minúscula', ok: (s) => /[a-z]/.test(s) },
  { texto: 'Uma letra maiúscula', ok: (s) => /[A-Z]/.test(s) },
  { texto: 'Um número', ok: (s) => /\d/.test(s) }
];

export const senhaValida = (senha) => REGRAS_SENHA.every((r) => r.ok(senha || ''));

// Validação de senha e confirmação antes de enviar; a API confere de novo
export function errosDeSenha(senha, confirmacao, campo = 'senha') {
  const erros = {};
  if (!senha) erros[campo] = 'Informe a senha.';
  else if (!senhaValida(senha)) erros[campo] = 'A senha não atende aos requisitos.';
  else if (senha !== confirmacao) erros.confirmacao = 'A confirmação não confere com a senha.';
  return erros;
}
