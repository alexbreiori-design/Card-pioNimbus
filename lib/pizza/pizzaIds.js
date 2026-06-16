export const PIZZA_VIRTUAL_CATEGORY_ID = 'nimbus-pizza-categoria';
export const PIZZA_CATEGORY_NAME = 'Pizzas';

/** @deprecated use buildPizzaProductId */
export const PIZZA_VIRTUAL_PRODUCT_ID = 'nimbus-pizza-monte-sua';

export function pizzaUid(prefix = 'piz') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buildPizzaProductId(pizzaId) {
  return `nimbus-pizza-${String(pizzaId || '').trim()}`;
}

export function parsePizzaProductId(productId) {
  const safe = String(productId || '').trim();
  if (safe === PIZZA_VIRTUAL_PRODUCT_ID) return safe;
  const match = safe.match(/^nimbus-pizza-(.+)$/);
  return match ? match[1] : null;
}

export function isPizzaProductId(productId) {
  const safe = String(productId || '').trim();
  if (safe.startsWith('nimbus-pizza-promo-')) return false;
  return Boolean(parsePizzaProductId(safe));
}
