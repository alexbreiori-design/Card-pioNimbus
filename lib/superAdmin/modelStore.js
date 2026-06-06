import { getConfiguredDefaultSlug } from '@/lib/storeBoot';
import { normalizeSlug } from '@/lib/normalize';

/** Slug da loja modelo Nimbus — sempre primeiro na lista de lojas. */
export function getModelStoreSlug() {
  return normalizeSlug(getConfiguredDefaultSlug());
}

export function isModelStoreSlug(slug) {
  const model = getModelStoreSlug();
  const safe = normalizeSlug(slug);
  return Boolean(model && safe && model === safe);
}

export function withModelStoreFlags(stores) {
  return (stores || []).map((store) => ({
    ...store,
    isModel: isModelStoreSlug(store.slug),
  }));
}

/** Loja modelo fixa no topo; demais por data de criação (mais recentes primeiro). */
export function sortStoresWithModelFirst(stores) {
  const modelSlug = getModelStoreSlug();
  return [...(stores || [])].sort((a, b) => {
    if (modelSlug) {
      if (a.slug === modelSlug) return -1;
      if (b.slug === modelSlug) return 1;
    }
    const aTs = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTs = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTs - aTs;
  });
}
