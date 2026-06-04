export function formatMoneyBrInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const cents = Number(digits);
  if (!Number.isFinite(cents)) return '';
  const amount = cents / 100;
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function parseMoneyBrInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

export function hasMoneyBrValue(value) {
  return parseMoneyBrInput(value) > 0;
}
