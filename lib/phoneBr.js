/** Celular BR: (00) 00000-0000 — 11 dígitos (DDD + 9 + 8). */

export const MOBILE_PHONE_MASK = '(00) 00000-0000';
export const MOBILE_PHONE_DIGITS = 11;

export function formatMobilePhoneBr(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, MOBILE_PHONE_DIGITS);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function mobilePhoneDigits(value) {
  return String(value || '').replace(/\D/g, '').slice(0, MOBILE_PHONE_DIGITS);
}

export function isCompleteMobilePhoneBr(value) {
  return mobilePhoneDigits(value).length === MOBILE_PHONE_DIGITS;
}

export function mobilePhoneIncompleteMessage() {
  return 'Número incompleto. Use o formato (00) 00000-0000.';
}
