/** Produto pode ir direto ao pedido sem abrir modal de personalização. */
export function canQuickAddProduct(product) {
  if (!product) return false;
  if (product.type === 'pizza_sabor_promo' || product.promoPreset) return false;
  if (product.type === 'pizza' && product.pizzaConfig) return false;
  if (product.type === 'marmita' && (product.addons || []).length > 0) return false;
  if ((product.addons || []).length > 0) return false;
  return true;
}
