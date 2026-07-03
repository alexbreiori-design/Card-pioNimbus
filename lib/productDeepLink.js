const PRODUCT_QUERY_KEY = 'p';

export function normalizeProductDeepLinkId(value) {
  const id = String(value || '').trim();
  return id || '';
}

export function readProductIdFromSearchParams(searchParams) {
  if (!searchParams || typeof searchParams !== 'object') return '';
  const raw = searchParams[PRODUCT_QUERY_KEY] ?? searchParams.produto ?? searchParams.product;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return normalizeProductDeepLinkId(value);
}

export function buildProductShareUrl(baseUrl, productId) {
  const safeId = normalizeProductDeepLinkId(productId);
  if (!safeUrl(baseUrl) || !safeId) return safeUrl(baseUrl) || '';
  try {
    const url = new URL(baseUrl);
    url.searchParams.set(PRODUCT_QUERY_KEY, safeId);
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export function syncProductQueryParam(productId) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const safeId = normalizeProductDeepLinkId(productId);
  if (safeId) {
    url.searchParams.set(PRODUCT_QUERY_KEY, safeId);
  } else {
    url.searchParams.delete(PRODUCT_QUERY_KEY);
    url.searchParams.delete('produto');
    url.searchParams.delete('product');
  }
  window.history.replaceState({}, '', url);
}

function safeUrl(value) {
  const text = String(value || '').trim();
  return text || '';
}

export { PRODUCT_QUERY_KEY };
