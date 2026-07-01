import { normalizeSlug } from '@/lib/normalize';
import { isValidStoreSlug } from '@/lib/superAdmin';

/** Segmento de URL do cardápio público v2 (preview interno). */
export const CARDAPIO_V2_SEGMENT = 'v2';

/** Caminho interno: /{slug}/v2 */
export function buildCardapioV2Path(slug) {
  const safe = normalizeSlug(slug);
  if (!safe) return '';
  return `/${safe}/${CARDAPIO_V2_SEGMENT}`;
}

/** Permite redirect pós-login para rotas de preview v2. */
export function isCardapioV2Path(pathname) {
  if (!pathname || typeof pathname !== 'string') return false;
  const match = pathname.match(/^\/([a-z0-9]+(?:-[a-z0-9]+)*)\/v2\/?$/);
  if (!match) return false;
  return isValidStoreSlug(match[1]);
}

/** Ignora o segmento /v2 ao inferir slug pela URL. */
export function resolveStoreSlugFromPathname(pathname) {
  const segments = String(pathname || '')
    .split('/')
    .filter(Boolean)
    .map((part) => part.toLowerCase());
  if (segments.length >= 2 && segments[segments.length - 1] === 'v2') {
    return normalizeSlug(segments[segments.length - 2]);
  }
  const last = segments.at(-1) || '';
  return last === 'v2' ? '' : normalizeSlug(last);
}
