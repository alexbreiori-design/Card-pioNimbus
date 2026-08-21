/** Dígitos nacionais do WhatsApp do entregador (exatamente 11). */
export function entregadorPhoneDigits(telefone) {
  const digits = String(telefone || '').replace(/\D/g, '');
  if (digits.length === 11) return digits;
  if (digits.length === 13 && digits.startsWith('55')) return digits.slice(2);
  return '';
}

export function isEntregadorWhatsAppValid(telefone) {
  return entregadorPhoneDigits(telefone).length === 11;
}

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

/** URL wa.me do entregador com a mensagem da rota pré-preenchida. */
export function buildRouteWhatsAppUrl(telefone, message) {
  const national = entregadorPhoneDigits(telefone);
  if (!national || !message) return null;
  return `https://wa.me/55${national}?text=${encodeURIComponent(message)}`;
}
