import { normalizeSlug } from '@/lib/normalize';
import { isValidStoreSlug } from '@/lib/superAdmin';

const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'app', 'api', 'sistema']);

/** Domínio raiz do produto (ex.: cardapionimbus.com.br). */
export function getRootDomain() {
  return String(process.env.NEXT_PUBLIC_ROOT_DOMAIN || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '');
}

export function isReservedSubdomain(subdomain) {
  return RESERVED_SUBDOMAINS.has(String(subdomain || '').trim().toLowerCase());
}

/** Extrai slug da loja a partir do host (subdomínio). */
export function resolveSlugFromHost(hostname) {
  const host = String(hostname || '').split(':')[0].trim().toLowerCase();
  if (!host) return null;

  if (host.endsWith('.localhost')) {
    const sub = host.slice(0, -'.localhost'.length);
    if (!sub || sub.includes('.') || isReservedSubdomain(sub)) return null;
    const slug = normalizeSlug(sub);
    return isValidStoreSlug(slug) ? slug : null;
  }

  const root = getRootDomain();
  if (!root) return null;

  if (host === root || host === `www.${root}`) return null;

  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    if (!sub || sub.includes('.') || isReservedSubdomain(sub)) return null;
    const slug = normalizeSlug(sub);
    return isValidStoreSlug(slug) ? slug : null;
  }

  return null;
}

export function isApexHost(hostname) {
  const host = String(hostname || '').split(':')[0].trim().toLowerCase();
  const root = getRootDomain();
  if (!root) return false;
  return host === root || host === `www.${root}`;
}

/** Origem pública do site (apex — marketing, admin, login). */
export function getSiteOrigin() {
  const fromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const vercel = String(process.env.VERCEL_URL || '').trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3010';
}

/** URL pública do cardápio de uma loja (subdomínio em produção). */
export function getStorePublicUrl(slug) {
  const safe = normalizeSlug(slug);
  if (!safe) return getSiteOrigin();

  const root = getRootDomain();
  if (root) {
    const origin = getSiteOrigin();
    const protocol = origin.startsWith('http://') ? 'http' : 'https';
    return `${protocol}://${safe}.${root}`;
  }

  return `${getSiteOrigin()}/${safe}`;
}

/** Garante URL absoluta para imagens em metadados. */
export function toAbsoluteAssetUrl(url, origin = getSiteOrigin()) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `${origin}${trimmed}`;
  return trimmed;
}
