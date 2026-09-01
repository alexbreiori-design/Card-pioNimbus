/**
 * Exibição de preço no cardápio público — oculta R$ 0,00 (como já ocorre em adicionais).
 */
export function hasVisibleCatalogPrice(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0;
}

export function shouldShowProductListPrice(product) {
  if (!product) return false;
  const isPromo = product.isPromocao && product.promoOriginalPrice > product.price;
  if (isPromo) {
    return (
      hasVisibleCatalogPrice(product.price) || hasVisibleCatalogPrice(product.promoOriginalPrice)
    );
  }
  return hasVisibleCatalogPrice(product.price);
}

export function shouldShowModalUnitPrice(product, unitPrice) {
  if (!product) return hasVisibleCatalogPrice(unitPrice);
  const isPromo = product.isPromocao && product.promoOriginalPrice > product.price;
  if (isPromo) {
    return (
      hasVisibleCatalogPrice(unitPrice) || hasVisibleCatalogPrice(product.promoOriginalPrice)
    );
  }
  if (product.priceDisplayOnly && hasVisibleCatalogPrice(product.price)) return true;
  return hasVisibleCatalogPrice(unitPrice);
}
