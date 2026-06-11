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

const FBE_EVENTS_SRC = 'https://connect.facebook.net/en_US/fbevents.js';
const STUB_SCRIPT_ID = 'meta-pixel-stub';

let initializedPixelId = null;

/** Meta Pixel IDs são numéricos — rejeita qualquer outro caractere. */
export function sanitizeMetaPixelId(pixelId) {
  const digits = String(pixelId || '').replace(/\D/g, '');
  return digits || null;
}

/** Instala o stub oficial da Meta (fila de eventos + carrega fbevents.js). */
export function ensureMetaPixelBase() {
  if (typeof window === 'undefined') return false;
  if (typeof window.fbq === 'function') return true;
  if (document.getElementById(STUB_SCRIPT_ID)) {
    return typeof window.fbq === 'function';
  }

  const stub = document.createElement('script');
  stub.id = STUB_SCRIPT_ID;
  stub.textContent = `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'${FBE_EVENTS_SRC}');
`;
  document.head.appendChild(stub);
  return typeof window.fbq === 'function';
}

/** Inicializa o pixel com ID já sanitizado. Retorna false se ID inválido. */
export function initMetaPixel(pixelId) {
  const safe = sanitizeMetaPixelId(pixelId);
  if (!safe) {
    initializedPixelId = null;
    return false;
  }
  ensureMetaPixelBase();
  if (typeof window.fbq !== 'function') return false;
  if (initializedPixelId !== safe) {
    window.fbq('init', safe);
    initializedPixelId = safe;
  }
  return true;
}

export function isMetaPixelReady() {
  return (
    typeof window !== 'undefined' &&
    typeof window.fbq === 'function' &&
    Boolean(initializedPixelId)
  );
}

/** Dispara evento padrão (PageView, AddToCart, InitiateCheckout, Purchase). */
export function trackMetaEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || !STANDARD_SET.has(eventName)) return;
  ensureMetaPixelBase();
  if (typeof window.fbq !== 'function') return;
  window.fbq('track', eventName, params);
}

export function trackMetaPageView() {
  trackMetaEvent('PageView');
}
