// Formatos de data usados no painel e nas solicitações de ajuste

// "2026-10-30T09:40:00" -> "30/10/2026 09:40"
export function dataHora(iso) {
  if (!iso) return '';
  const [data, hora = ''] = String(iso).split('T');
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}${hora ? ` ${hora.slice(0, 5)}` : ''}`;
}

// "2026-10-22T..." -> "22/10"
export function diaMes(iso) {
  if (!iso) return '';
  const [, mes, dia] = String(iso).slice(0, 10).split('-');
  return `${dia}/${mes}`;
}

// "Carol está atualizando" / "Você está visualizando"
export function textoPresenca(presenca) {
  return `${presenca.propria ? 'Você' : presenca.nome.split(' ')[0]} está ${presenca.acao}`;
}
