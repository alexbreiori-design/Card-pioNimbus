/**
 * Preço base cobrado no item (sem adicionais).
 * Com priceDisplayOnly / precoSoExibicao, o valor cadastrado é só vitrine.
 */
export function getProductChargeBase(product) {
  if (!product) return 0;
  if (product.priceDisplayOnly === true || product.precoSoExibicao === true) return 0;
  const price = Number(product.price ?? product.preco ?? 0);
  return Number.isFinite(price) ? price : 0;
}
