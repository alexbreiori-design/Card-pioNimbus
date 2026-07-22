export function digitsFromCard(value) {
  return String(value || '').replace(/\D/g, '');
}

export function detectCardBrand(number) {
  const n = digitsFromCard(number);
  if (!n) return 'card';
  if (/^4/.test(n)) return 'visa';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (
    /^(4011|4312|4389|4514|4576|5041|5066|5067|5090|6277|6362|6363|6500|6504|6505|6507|6509|6516|6550)/.test(
      n
    )
  ) {
    return 'elo';
  }
  return 'card';
}

export function cardBrandLabel(brand) {
  switch (brand) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'Amex';
    case 'elo':
      return 'Elo';
    default:
      return 'Cartão';
  }
}

export function maskCardLast4(numberOrLast4) {
  const digits = digitsFromCard(numberOrLast4);
  const last4 = digits.slice(-4);
  if (!last4) return '';
  return `•••• ${last4}`;
}

/** Máscara no formato pedido: **** **** **** 1234 */
export function maskCardNumberDisplay(numberOrLast4) {
  const digits = digitsFromCard(numberOrLast4);
  const last4 = digits.slice(-4);
  if (!last4) return '';
  return `**** **** **** ${last4}`;
}
