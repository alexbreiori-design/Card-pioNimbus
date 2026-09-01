import { buildProductSectionKey } from '@/lib/cardapio/catalogSections';
import { buildCardapioCatalog } from '@/lib/cardapio/catalogFromStore';
import { sanitizePublicStoreState } from '@/lib/storeStatePublic';
import { PROMO_CATEGORY_NAME } from '@/lib/promocoes';

const SECTION_KEY_PREFIX_RE = /^(product|marmita|pizza|faixa):/;

function isCatalogSectionKey(value) {
  return SECTION_KEY_PREFIX_RE.test(String(value || ''));
}

function usesSectionKeyCategories(categories = []) {
  return categories
    .filter((cat) => cat !== 'Todos' && cat !== PROMO_CATEGORY_NAME)
    .some((cat) => isCatalogSectionKey(cat));
}

/** catalog_public salvo antes do sectionKey usa nomes de categoria em categories[]. */
export function isLegacyCatalogPublicFormat(categories = [], products = []) {
  const categorySet = new Set(
    (categories || []).filter((cat) => cat !== 'Todos' && cat !== PROMO_CATEGORY_NAME)
  );
  const sample = (products || []).slice(0, 50);
  if (!sample.length || !categorySet.size) return false;

  if (!usesSectionKeyCategories(categories)) {
    if (sample.some((product) => product?.category && !product?.sectionKey)) {
      return true;
    }
  }

  // Nomes com ":" (ex.: "Marmitex Do Dia:") não são sectionKey — detecta órfãos.
  const orphanCount = sample.filter((product) => {
    const key = product?.sectionKey || buildProductSectionKey(product);
    return !categorySet.has(key);
  }).length;

  return orphanCount === sample.length;
}

function resolveLegacyProductSectionKey(product) {
  if (product?.sectionKey) return product.sectionKey;
  if (product?.category === PROMO_CATEGORY_NAME) return PROMO_CATEGORY_NAME;
  if (product?.category) return product.category;
  return buildProductSectionKey(product);
}

function normalizeLegacyCatalogPublic(resolved) {
  const categories = resolved.categories || ['Todos'];
  const categoryLabelsByKey = { ...(resolved.categoryLabelsByKey || {}) };

  categories.forEach((cat) => {
    if (cat !== 'Todos' && cat !== PROMO_CATEGORY_NAME) {
      categoryLabelsByKey[cat] = categoryLabelsByKey[cat] || cat;
    }
  });

  const mapProducts = (items) =>
    (items || []).map((product) => ({
      ...product,
      sectionKey: resolveLegacyProductSectionKey(product),
    }));

  return {
    ...resolved,
    products: mapProducts(resolved.products),
    promoCarouselProducts: mapProducts(resolved.promoCarouselProducts),
    categoryLabelsByKey,
  };
}

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
      categoryLabelsByKey: catalog.categoryLabelsByKey || {},
      categoryIconsByName: catalog.categoryIconsByName,
      categoryLayoutsByName: catalog.categoryLayoutsByName,
      marmitaGrupoLayoutsById: catalog.marmitaGrupoLayoutsById || {},
      cupons: catalog.cupons,
    },
  };
}

/** Resolve catálogo a partir do payload público (novo ou legado). */
export function resolveCardapioFromPublicPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;

  let resolved;

  if (payload.catalog && typeof payload.catalog === 'object') {
    const categories = payload.catalog.categories || ['Todos'];
    const categoryLabelsByKey = payload.catalog.categoryLabelsByKey || {};
    const legacyLabels = categories.reduce((acc, cat) => {
      if (cat !== 'Todos' && !acc[cat]) acc[cat] = cat;
      return acc;
    }, {});

    resolved = {
      loja: payload.loja,
      _meta: payload._meta,
      products: payload.catalog.products || [],
      promoCarouselProducts: payload.catalog.promoCarouselProducts || [],
      categories,
      categoryLabelsByKey: { ...legacyLabels, ...categoryLabelsByKey },
      categoryIconsByName: payload.catalog.categoryIconsByName || {},
      categoryLayoutsByName: payload.catalog.categoryLayoutsByName || {},
      marmitaGrupoLayoutsById: payload.catalog.marmitaGrupoLayoutsById || {},
      cupons: payload.catalog.cupons || [],
    };
  } else {
    const catalog = buildCardapioCatalog(payload);
    resolved = {
      loja: payload.loja,
      _meta: payload._meta,
      products: catalog.products,
      promoCarouselProducts: catalog.promoCarouselProducts,
      categories: catalog.categories,
      categoryLabelsByKey: catalog.categoryLabelsByKey || {},
      categoryIconsByName: catalog.categoryIconsByName,
      categoryLayoutsByName: catalog.categoryLayoutsByName,
      marmitaGrupoLayoutsById: catalog.marmitaGrupoLayoutsById || {},
      cupons: catalog.cupons,
    };
  }

  if (isLegacyCatalogPublicFormat(resolved.categories, resolved.products)) {
    return normalizeLegacyCatalogPublic(resolved);
  }

  return resolved;
}
