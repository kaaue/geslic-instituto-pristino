// Máscaras dos campos da tela de equipamentos.
// Cada função recebe o que o usuário digitou e devolve o texto já formatado,
// para o campo mostrar o formato certo enquanto a pessoa digita.

// Etiqueta do Instituto: PRI-0000
// Deixo o prefixo fixo e aceito só quatro dígitos depois dele.
export function mascaraEtiquetaInstituto(valor) {
  const digitos = String(valor).toUpperCase().replace(/[^0-9]/g, '').slice(0, 4);
  if (digitos === '') return '';
  return `PRI-${digitos}`;
}

// Etiqueta NetScanner: NS-000000
export function mascaraEtiquetaNetscanner(valor) {
  const digitos = String(valor).toUpperCase().replace(/[^0-9]/g, '').slice(0, 6);
  if (digitos === '') return '';
  return `NS-${digitos}`;
}

// Patrimônio: só números, até 20 dígitos
export function mascaraPatrimonio(valor) {
  return String(valor).replace(/[^0-9]/g, '').slice(0, 20);
}

// Valor em reais: a pessoa digita só números e a máscara monta os centavos.
// Digitar 480000 mostra 4.800,00.
export function mascaraMoeda(valor) {
  const digitos = String(valor).replace(/[^0-9]/g, '').slice(0, 12);
  if (digitos === '') return '';
  const numero = Number(digitos) / 100;
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Converte o texto da máscara de moeda de volta para número, para enviar à API
export function moedaParaNumero(texto) {
  if (!texto) return null;
  const limpo = String(texto).replace(/\./g, '').replace(',', '.');
  const numero = Number(limpo);
  return Number.isNaN(numero) ? null : numero;
}

// Converte o número vindo da API para o texto da máscara
export function numeroParaMoeda(numero) {
  if (numero === null || numero === undefined || numero === '') return '';
  return Number(numero).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
