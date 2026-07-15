import { randomBytes } from 'crypto';
import { getSiteOrigin } from '@/lib/siteUrl';

export function generateRoutePublicToken() {
  return randomBytes(18).toString('hex');
}

export function buildRouteDriverUrl(token) {
  const safe = String(token || '').trim();
  if (!safe) return '';
  return `${getSiteOrigin()}/rota/${encodeURIComponent(safe)}`;
}
