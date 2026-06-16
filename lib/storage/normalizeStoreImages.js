import { isDataImageUrl } from '@/lib/storage/parseDataUrl';

const IMAGE_FIELD_KEYS = new Set([
  'imagemUrl',
  'imageUrl',
  'logoUrl',
  'capaUrl',
  'capaOriginalUrl',
  'paletteLogoUrl',
  'logoComandaUrl',
]);

const FOLDER_BY_PARENT_KEY = {
  loja: 'loja',
  produtos: 'produtos',
  adicionaisItens: 'adicionais',
  marmitas: 'marmitas',
  pizzas: 'pizzas',
  sabores: 'pizza-sabores',
  categorias: 'pizza-categorias',
};

function folderForContext(parentKey, fallback = 'misc') {
  if (!parentKey) return fallback;
  return FOLDER_BY_PARENT_KEY[parentKey] || fallback;
}

export function storeHasEmbeddedImages(state) {
  const stack = [state];
  while (stack.length) {
    const node = stack.pop();
    if (!node) continue;
    if (Array.isArray(node)) {
      node.forEach((item) => stack.push(item));
      continue;
    }
    if (typeof node !== 'object') continue;
    for (const [key, value] of Object.entries(node)) {
      if (IMAGE_FIELD_KEYS.has(key) && isDataImageUrl(value)) return true;
      if (value && typeof value === 'object') stack.push(value);
    }
  }
  return false;
}

async function normalizeNode(node, slug, upload, parentKey = '') {
  if (Array.isArray(node)) {
    const next = [];
    let changed = false;
    for (const item of node) {
      const result = await normalizeNode(item, slug, upload, parentKey);
      next.push(result.value);
      if (result.changed) changed = true;
    }
    return { value: next, changed };
  }

  if (!node || typeof node !== 'object') {
    return { value: node, changed: false };
  }

  const folder = folderForContext(parentKey);
  let changed = false;
  const next = { ...node };

  for (const [key, value] of Object.entries(node)) {
    if (IMAGE_FIELD_KEYS.has(key) && isDataImageUrl(value)) {
      const uploaded = await upload(slug, value, folder);
      if (uploaded !== value) changed = true;
      next[key] = uploaded;
      continue;
    }

    if (value && typeof value === 'object') {
      const child = await normalizeNode(value, slug, upload, key);
      if (child.changed) changed = true;
      next[key] = child.value;
    }
  }

  return { value: next, changed };
}

/** Substitui data:image/* por URLs do Storage em todo o estado da loja. */
export async function normalizeStoreStateImages(state, slug, upload) {
  if (!state || typeof state !== 'object') return state;
  if (!storeHasEmbeddedImages(state)) return state;
  const result = await normalizeNode(state, slug, upload, '');
  return result.value;
}
