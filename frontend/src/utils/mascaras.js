// Máscaras dos campos da tela de equipamentos.
// Cada função recebe o que o usuário digitou e devolve o texto já formatado,
// para o campo mostrar o formato certo enquanto a pessoa digita.

// Etiqueta do Instituto: IP0000
// IP de Instituto Prístino. O prefixo é fixo e aceito só quatro dígitos
// depois dele, então a pessoa digita apenas os números.
export function mascaraEtiquetaInstituto(valor) {
  const digitos = String(valor).toUpperCase().replace(/[^0-9]/g, '').slice(0, 4);
  if (digitos === '') return '';
  return `IP${digitos}`;
}

// Etiqueta NetScanner: NS-000000
export function mascaraEtiquetaNetscanner(valor) {
  const digitos = String(valor).toUpperCase().replace(/[^0-9]/g, '').slice(0, 6);
  if (digitos === '') return '';
  return `NS-${digitos}`;
}

// Valor em reais: a pessoa digita só números e a máscara monta os centavos.
// Não é usada no cadastro de equipamentos, que não guarda valor, mas serve
// aos bens seguráveis e às vigências, que têm valor contratado.
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

// ---------------------------------------------------------------
// Máscaras da tela de projetos (RF_F1)
// ---------------------------------------------------------------

// Código do projeto: exatamente quatro dígitos (RN19)
export function mascaraCodigoProjeto(valor) {
  return String(valor).replace(/[^0-9]/g, '').slice(0, 4);
}

// Data no padrão brasileiro: a pessoa digita só números e a máscara põe as barras.
// Digitar 31122026 mostra 31/12/2026.
export function mascaraData(valor) {
  const d = String(valor).replace(/[^0-9]/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// DD/MM/AAAA -> AAAA-MM-DD (formato da API). Incompleta vira o próprio texto,
// para a API devolver "data inválida" no campo certo.
export function dataParaApi(texto) {
  if (!texto) return null;
  const partes = String(texto).split('/');
  if (partes.length !== 3 || partes[2].length !== 4) return String(texto);
  return `${partes[2]}-${partes[1]}-${partes[0]}`;
}

// AAAA-MM-DD -> DD/MM/AAAA
export function dataDaApi(iso) {
  if (!iso) return '';
  const [ano, mes, dia] = String(iso).slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

// ---------------------------------------------------------------
// Máscaras dos cadastros das funções básicas (RF_B1 e RF_B6)
// ---------------------------------------------------------------

// CNPJ: 00.000.000/0000-00. A API guarda só os 14 dígitos.
export function mascaraCnpj(valor) {
  const d = String(valor ?? '').replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// Telefone: (00) 0000-0000 ou (00) 00000-0000
export function mascaraTelefone(valor) {
  const d = String(valor ?? '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Placa de veículo: ABC-1234 ou Mercosul ABC-1D23
export function mascaraPlaca(valor) {
  const limpo = String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  return limpo.length > 3 ? `${limpo.slice(0, 3)}-${limpo.slice(3)}` : limpo;
}

// Converte o número vindo da API para o texto da máscara
export function numeroParaMoeda(numero) {
  if (numero === null || numero === undefined || numero === '') return '';
  return Number(numero).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
