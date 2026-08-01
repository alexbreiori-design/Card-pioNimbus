/** Acrescenta complemento a um texto de endereço já montado. */
export function appendAddressComplement(base, complemento) {
  const text = String(base || '').trim();
  const comp = String(complemento || '').trim();
  if (!comp) return text;
  if (!text) return comp;
  if (text.toLowerCase().includes(comp.toLowerCase())) return text;
  return `${text} — ${comp}`;
}

/**
 * Linha única de endereço para comanda / pedidos.
 * Inclui complemento quando informado.
 */
export function formatDeliveryAddressLine({
  logradouro = '',
  numero = '',
  bairro = '',
  cidade = '',
  complemento = '',
} = {}) {
  const base = `${String(logradouro || '').trim()}${
    numero ? `, ${String(numero).trim()}` : ''
  } - ${String(bairro || '').trim()} - ${String(cidade || '').trim()}`
    .replace(/\s+/g, ' ')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/^\s*-\s*|\s*-\s*$/g, '')
    .trim();
  return appendAddressComplement(base, complemento);
}
