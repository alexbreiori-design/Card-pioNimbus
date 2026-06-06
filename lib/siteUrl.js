/** Origem pública do site (preview WhatsApp, Open Graph). */
export function getSiteOrigin() {
  const fromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const vercel = String(process.env.VERCEL_URL || '').trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3010';
}

/** Garante URL absoluta para imagens em metadados. */
export function toAbsoluteAssetUrl(url, origin = getSiteOrigin()) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `${origin}${trimmed}`;
  return trimmed;
}
