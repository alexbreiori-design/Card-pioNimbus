/** Texto para colar no WhatsApp junto com o link da rota. */
export function buildRouteShareMessage(titulo, mapsUrl, entregadorNome = '', driverUrl = '') {
  const header = String(titulo || 'Rota de entrega').trim();
  const driver = String(entregadorNome || '').trim();
  const withDriver = driver ? `${header} · ${driver}` : header;
  const url = String(mapsUrl || '').trim();
  const markUrl = String(driverUrl || '').trim();
  const lines = [withDriver];
  if (url) lines.push(`Maps: ${url}`);
  if (markUrl) lines.push(`Marcar entregue: ${markUrl}`);
  return lines.join('\n').trim();
}
