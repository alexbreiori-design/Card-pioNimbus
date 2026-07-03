/** GA4 / GTM — sanitização e eventos do cardápio online. */

export const GOOGLE_STANDARD_EVENTS = ['page_view', 'add_to_cart', 'begin_checkout', 'purchase'];

const GA4_PATTERN = /^G-[A-Z0-9]{6,}$/i;
const GTM_PATTERN = /^GTM-[A-Z0-9]{4,}$/i;

let initializedGa4Id = null;
let initializedGtmId = null;

export function sanitizeGa4MeasurementId(value) {
  const candidate = String(value || '').trim().toUpperCase();
  return GA4_PATTERN.test(candidate) ? candidate : null;
}

export function sanitizeGtmContainerId(value) {
  const candidate = String(value || '').trim().toUpperCase();
  return GTM_PATTERN.test(candidate) ? candidate : null;
}

function ensureDataLayer() {
  if (typeof window === 'undefined') return false;
  window.dataLayer = window.dataLayer || [];
  return true;
}

export function ensureGtagScript() {
  if (typeof window === 'undefined') return false;
  if (typeof window.gtag === 'function') return true;
  if (document.getElementById('nimbus-gtag-script')) {
    return typeof window.gtag === 'function';
  }

  ensureDataLayer();
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());

  const script = document.createElement('script');
  script.id = 'nimbus-gtag-script';
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=GA4_PLACEHOLDER';
  document.head.appendChild(script);
  return typeof window.gtag === 'function';
}

export function initGoogleAnalytics({ ga4MeasurementId, gtmContainerId } = {}) {
  if (typeof window === 'undefined') return { ga4: false, gtm: false };

  const ga4Id = sanitizeGa4MeasurementId(ga4MeasurementId);
  const gtmId = sanitizeGtmContainerId(gtmContainerId);
  let ga4Ready = false;
  let gtmReady = false;

  if (gtmId && initializedGtmId !== gtmId) {
    ensureDataLayer();
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.id = 'nimbus-gtm-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.appendChild(script);
    initializedGtmId = gtmId;
    gtmReady = true;
  } else if (gtmId) {
    gtmReady = true;
  }

  if (ga4Id) {
    ensureGtagScript();
    const script = document.getElementById('nimbus-gtag-script');
    if (script && script.src.includes('GA4_PLACEHOLDER')) {
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
    }
    if (typeof window.gtag === 'function') {
      if (initializedGa4Id !== ga4Id) {
        window.gtag('config', ga4Id, { send_page_view: false });
        initializedGa4Id = ga4Id;
      }
      ga4Ready = true;
    }
  }

  return { ga4: ga4Ready, gtm: gtmReady };
}

export function isGoogleAnalyticsReady() {
  return Boolean(initializedGa4Id || initializedGtmId);
}

export function trackGoogleEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  if (!GOOGLE_STANDARD_EVENTS.includes(eventName)) return;
  if (!initializedGa4Id && !initializedGtmId) return;

  ensureDataLayer();
  if (typeof window.gtag === 'function' && initializedGa4Id) {
    window.gtag('event', eventName, params);
  }
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
}

export function trackGooglePageView(path) {
  trackGoogleEvent('page_view', {
    page_path: path || (typeof window !== 'undefined' ? window.location.pathname : ''),
    page_location: typeof window !== 'undefined' ? window.location.href : '',
  });
}

export function trackGoogleAddToCart(params = {}) {
  trackGoogleEvent('add_to_cart', params);
}

export function trackGoogleBeginCheckout(params = {}) {
  trackGoogleEvent('begin_checkout', params);
}

export function trackGooglePurchase(params = {}) {
  trackGoogleEvent('purchase', params);
}
