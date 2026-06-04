/** Máximo de produtos em "Peça também" no cardápio. */
export const MAX_PECA_TAMBEM = 5;

/** Desconto padrão sugerido ao montar combo (editável pelo usuário). */
export const COMBO_SUGGESTED_DISCOUNT_PERCENT = 10;

export const COMBO_PRICE_MULTIPLIER = 1 - COMBO_SUGGESTED_DISCOUNT_PERCENT / 100;

export function normalizePecaTambemIds(value) {
  const ids = Array.isArray(value) ? value : [];
  return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))].slice(0, MAX_PECA_TAMBEM);
}

export function suggestedComboPrice(totalItens) {
  const total = Number(totalItens || 0);
  if (!Number.isFinite(total) || total <= 0) return 0;
  return total * COMBO_PRICE_MULTIPLIER;
}

export function formatComboPriceBr(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}
