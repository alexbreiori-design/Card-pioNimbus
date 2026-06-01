const ACTIVE_STORE_KEY = 'cardapio_admin_active_store_slug';

export function normalizeStoreSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export function readActiveStoreSlug() {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeStoreSlug(window.localStorage.getItem(ACTIVE_STORE_KEY) || '');
  } catch {
    return '';
  }
}

export function writeActiveStoreSlug(slug) {
  if (typeof window === 'undefined') return;
  const safe = normalizeStoreSlug(slug);
  if (!safe) return;
  try {
    window.localStorage.setItem(ACTIVE_STORE_KEY, safe);
  } catch {
    /* ignore */
  }
}

/** Escolhe slug ativo entre memberships do usuário. */
export function pickActiveStoreSlug(memberships, preferredSlug = '') {
  const allowed = (memberships || [])
    .map((m) => normalizeStoreSlug(m.slug))
    .filter(Boolean);
  if (!allowed.length) return '';

  const preferred = normalizeStoreSlug(preferredSlug);
  if (preferred && allowed.includes(preferred)) return preferred;

  const saved = readActiveStoreSlug();
  if (saved && allowed.includes(saved)) return saved;

  return allowed[0];
}
