export const PROMO_CATEGORY_NAME = 'Promoções';

export function getActivePromocoes(promocoes = [], produtos = []) {
  const activeProducts = new Set(
    produtos.filter((p) => p.ativo !== false).map((p) => p.id)
  );
  return (promocoes || [])
    .filter((p) => p.ativo !== false && activeProducts.has(p.produtoId))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

export function mergePromocoesIntoCardapio(produtos, promocoes = [], produtosRaw = []) {
  const activePromos = getActivePromocoes(promocoes, produtosRaw);
  if (!activePromos.length) {
    return { products: produtos, promoProductIds: new Set() };
  }

  const promoByProductId = new Map(activePromos.map((promo) => [promo.produtoId, promo]));
  const promoProductIds = new Set(activePromos.map((p) => p.produtoId));

  const productsWithPromoPricing = produtos.map((product) => {
    const promo = promoByProductId.get(product.id);
    if (!promo) return product;
    return {
      ...product,
      price: Number(promo.valorPromocional ?? product.price),
      promoOriginalPrice: Number(promo.valorOriginal ?? product.price),
      isPromocao: true,
    };
  });

  const byId = new Map(productsWithPromoPricing.map((p) => [p.id, p]));
  const promoEntries = activePromos
    .map((promo) => {
      const base = byId.get(promo.produtoId);
      if (!base) return null;
      return { ...base, category: PROMO_CATEGORY_NAME };
    })
    .filter(Boolean);

  return {
    products: productsWithPromoPricing,
    promoCarouselProducts: promoEntries,
    promoProductIds,
  };
}

export function prependPromoCategory(categories, hasPromos) {
  if (!hasPromos) {
    return categories.filter((name) => name !== PROMO_CATEGORY_NAME);
  }
  const without = categories.filter((name) => name !== PROMO_CATEGORY_NAME);
  return [PROMO_CATEGORY_NAME, ...without];
}
