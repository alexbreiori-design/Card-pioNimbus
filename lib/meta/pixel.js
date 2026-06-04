/**
 * Meta Pixel — eventos padrão do Facebook (cardápio online).
 * @see https://developers.facebook.com/docs/meta-pixel/reference
 */

export const META_STANDARD_EVENTS = [
  'PageView',
  'AddToCart',
  'InitiateCheckout',
  'Purchase',
];

const STANDARD_SET = new Set(META_STANDARD_EVENTS);

/** Meta Pixel IDs são numéricos — rejeita qualquer outro caractere. */
export function sanitizeMetaPixelId(pixelId) {
  const digits = String(pixelId || '').replace(/\D/g, '');
  return digits || null;
}

export function isMetaPixelReady() {
  return typeof window !== 'undefined' && typeof window.fbq === 'function';
}

/** Dispara evento padrão (PageView, AddToCart, InitiateCheckout, Purchase). */
export function trackMetaEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || !STANDARD_SET.has(eventName)) return;
  if (typeof window.fbq !== 'function') return;
  window.fbq('track', eventName, params);
}

export function trackMetaPageView() {
  trackMetaEvent('PageView');
}
