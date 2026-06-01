/**
 * Helpers para Meta Pixel (somente cardápio online).
 */

/** Meta Pixel IDs são numéricos — rejeita qualquer outro caractere. */
export function sanitizeMetaPixelId(pixelId) {
  const digits = String(pixelId || '').replace(/\D/g, '');
  return digits || null;
}

export function trackMetaEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', eventName, params);
}

export function trackMetaPageView() {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', 'PageView');
}
