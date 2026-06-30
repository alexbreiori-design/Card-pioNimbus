export function sanitizeCategoryIconId(iconId) {
  const safeId = String(iconId || '')
    .trim()
    .replace(/\.svg$/i, '');
  if (!safeId || safeId.includes('..') || safeId.includes('/') || safeId.includes('\\')) {
    return null;
  }
  return safeId;
}

export const FALLBACK_ICON_ID = 'burger';

export function getCategoryIconServePath(iconId) {
  const safeId = sanitizeCategoryIconId(iconId);
  if (!safeId) return `/api/icons/${FALLBACK_ICON_ID}`;
  return `/api/icons/${encodeURIComponent(safeId)}`;
}

export function humanizeIconId(id) {
  return String(id || '')
    .replace(/-stroke-rounded$/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function supportsMaskTint() {
  return true;
}

/** @deprecated use supportsMaskTint */
export function isStrokeCategoryIcon(icone) {
  return String(icone || '').includes('stroke-rounded');
}

export function getCategoryIconPath(icone) {
  const safe = String(icone || '').trim();
  if (!safe || safe.includes('/') || safe.includes('.')) {
    return getCategoryIconServePath(FALLBACK_ICON_ID);
  }
  return getCategoryIconServePath(safe);
}

export function mergeCategoryIconLists(primary = [], secondary = []) {
  const byId = new Map();
  [...primary, ...secondary].forEach((item) => {
    if (!item?.id) return;
    byId.set(item.id, item);
  });
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

/** Lista vazia — ícones vêm só dos arquivos em public/icons/ via API. */
export const LEGACY_CATEGORY_ICONS = [];
