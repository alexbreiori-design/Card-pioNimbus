/** Texto para colar no WhatsApp junto com o link da rota. */
export function buildRouteShareMessage(titulo, mapsUrl) {
  const header = String(titulo || 'Rota de entrega').trim();
  const url = String(mapsUrl || '').trim();
  if (!url) return header;
  return `${header}\n${url}`.trim();
}
