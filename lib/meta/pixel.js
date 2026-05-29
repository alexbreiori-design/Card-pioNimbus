/**
 * Helpers para Meta Pixel (somente cardápio online).
 */

export function trackMetaEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', eventName, params);
}

export function trackMetaPageView() {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  window.fbq('track', 'PageView');
}
