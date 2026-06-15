import { buildCardapioCatalog } from '@/lib/cardapio/catalogFromStore';
import { sanitizePublicStoreState } from '@/lib/storeStatePublic';

/** Monta o payload público enxuto (loja + catálogo pré-renderizado). */
export function buildCatalogPublic(adminState) {
  const sanitized = sanitizePublicStoreState(adminState);
  if (!sanitized) return null;

  const catalog = buildCardapioCatalog(sanitized);
  return {
    _meta: sanitized._meta,
    loja: sanitized.loja,
    catalog: {
      products: catalog.products,
      promoCarouselProducts: catalog.promoCarouselProducts,
      categories: catalog.categories,
      categoryIconsByName: catalog.categoryIconsByName,
      cupons: catalog.cupons,
    },
  };
}

/** Resolve catálogo a partir do payload público (novo ou legado). */
export function resolveCardapioFromPublicPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;

  if (payload.catalog && typeof payload.catalog === 'object') {
    return {
      loja: payload.loja,
      _meta: payload._meta,
      products: payload.catalog.products || [],
      promoCarouselProducts: payload.catalog.promoCarouselProducts || [],
      categories: payload.catalog.categories || ['Todos'],
      categoryIconsByName: payload.catalog.categoryIconsByName || {},
      cupons: payload.catalog.cupons || [],
    };
  }

  const catalog = buildCardapioCatalog(payload);
  return {
    loja: payload.loja,
    _meta: payload._meta,
    products: catalog.products,
    promoCarouselProducts: catalog.promoCarouselProducts,
    categories: catalog.categories,
    categoryIconsByName: catalog.categoryIconsByName,
    cupons: catalog.cupons,
  };
}
