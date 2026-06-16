export const PROMO_CATEGORY_NAME = 'Promoções';

function toActiveProductSet(source) {
  if (source instanceof Set) return source;
  if (Array.isArray(source) && source.length && typeof source[0] === 'string') {
    return new Set(source);
  }
  return new Set(
    (source || []).filter((product) => product && product.ativo !== false).map((product) => product.id)
  );
}

export function getActivePromocoes(promocoes = [], validProductIds = []) {
  const activeProducts = toActiveProductSet(validProductIds);
  return (promocoes || [])
    .filter((promo) => promo.ativo !== false && activeProducts.has(promo.produtoId))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

function buildPizzaPromoCarouselEntry(promo, pizzaProduct) {
  return {
    id: pizzaProduct.id,
    categoryId: pizzaProduct.categoryId || 'nimbus-pizza-categoria',
    category: PROMO_CATEGORY_NAME,
    name: pizzaProduct.nome || pizzaProduct.name,
    desc: pizzaProduct.descricao || pizzaProduct.desc || '',
    price: Number(promo.valorPromocional ?? pizzaProduct.preco ?? pizzaProduct.price ?? 0),
    promoOriginalPrice: Number(promo.valorOriginal ?? pizzaProduct.preco ?? pizzaProduct.price ?? 0),
    imageUrl: pizzaProduct.imagemUrl || pizzaProduct.imageUrl || '',
    type: 'pizza_sabor_promo',
    isPromocao: true,
    promoPreset: {
      saborId: pizzaProduct.saborId,
      tamanhoId: pizzaProduct.tamanhoId,
    },
  };
}

export function mergePromocoesIntoCardapio(
  produtos,
  promocoes = [],
  validProductIds = [],
  pizzaPromoProducts = []
) {
  const activeProducts = toActiveProductSet(validProductIds);
  pizzaPromoProducts.forEach((product) => activeProducts.add(product.id));

  const activePromos = getActivePromocoes(promocoes, activeProducts);
  if (!activePromos.length) {
    return { products: produtos, promoCarouselProducts: [], promoProductIds: new Set() };
  }

  const promoByProductId = new Map(activePromos.map((promo) => [promo.produtoId, promo]));
  const promoProductIds = new Set(activePromos.map((promo) => promo.produtoId));
  const pizzaPromoById = new Map(pizzaPromoProducts.map((product) => [product.id, product]));

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

  const byId = new Map(productsWithPromoPricing.map((product) => [product.id, product]));
  const promoEntries = activePromos
    .map((promo) => {
      const base = byId.get(promo.produtoId);
      if (base) return { ...base, category: PROMO_CATEGORY_NAME };
      const pizzaPromo = pizzaPromoById.get(promo.produtoId);
      if (!pizzaPromo) return null;
      return buildPizzaPromoCarouselEntry(promo, pizzaPromo);
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
