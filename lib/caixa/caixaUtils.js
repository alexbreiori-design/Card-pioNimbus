const SP_TZ = 'America/Sao_Paulo';

export function spDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: SP_TZ }).format(new Date(date));
}

export function isSameSpDay(a, b) {
  if (!a || !b) return false;
  const keyA = spDateKey(a);
  const keyB =
    typeof b === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(String(b).trim())
      ? String(b).trim()
      : spDateKey(b);
  return keyA === keyB;
}

export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function paymentLabel(code) {
  const labels = {
    debito: 'Débito',
    credito: 'Crédito',
    pix: 'Pix',
    dinheiro: 'Dinheiro',
  };
  return labels[code] || code || 'Outros';
}
