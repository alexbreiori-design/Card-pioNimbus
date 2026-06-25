/** Texto para colar no WhatsApp junto com o link da rota. */
export function buildRouteShareMessage(titulo, mapsUrl, orderedStops = []) {
  const header = String(titulo || 'Rota de entrega').trim();
  const url = String(mapsUrl || '').trim();
  const lines = (orderedStops || []).map((stop, index) => {
    const code = stop?.codigo ? `#${stop.codigo}` : `${index + 1}`;
    const name = stop?.clienteNome || 'Cliente';
    const address = stop?.enderecoTexto ? ` — ${stop.enderecoTexto}` : '';
    return `${index + 1}. ${code} ${name}${address}`;
  });

  let message = `${header}\n\n`;
  if (lines.length) {
    message += `Entregas (${lines.length}):\n${lines.join('\n')}\n\n`;
  }
  if (url) {
    message += `Abrir no Google Maps:\n${url}`;
  }
  return message.trim();
}
