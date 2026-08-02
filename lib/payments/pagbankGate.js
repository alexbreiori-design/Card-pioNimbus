import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';

/** Cookie/localStorage: liberar Connect PagBank só na loja modelo (prévia). */
export const PAGBANK_PREVIEW_KEY = 'nimbus:pagbank-preview';
export const PAGBANK_PREVIEW_COOKIE = 'nimbus_pagbank_preview';

/**
 * Quando true, PagBank fica aberto para todas as lojas (pós-homologação).
 * Defina NEXT_PUBLIC_PAGBANK_PUBLIC=1 (e/ou PAGBANK_PUBLIC=1 no server).
 */
export function isPagBankPubliclyEnabled() {
  return (
    process.env.NEXT_PUBLIC_PAGBANK_PUBLIC === '1' ||
    process.env.PAGBANK_PUBLIC === '1'
  );
}

/** Cliente: lê se a prévia está ligada neste browser. */
export function readPagBankPreviewUnlocked() {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PAGBANK_PREVIEW_KEY) === '1';
  } catch {
    return false;
  }
}

export function writePagBankPreviewUnlocked(enabled) {
  if (typeof window === 'undefined') return;
  try {
    if (enabled) {
      window.localStorage.setItem(PAGBANK_PREVIEW_KEY, '1');
      document.cookie = `${PAGBANK_PREVIEW_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      window.localStorage.removeItem(PAGBANK_PREVIEW_KEY);
      document.cookie = `${PAGBANK_PREVIEW_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
    }
  } catch {
    // ignore
  }
}

export function hasPagBankPreviewCookie(cookieHeader) {
  const raw = String(cookieHeader || '');
  return /(?:^|;\s*)nimbus_pagbank_preview=1(?:;|$)/.test(raw);
}

/**
 * UI / OAuth: PagBank liberado?
 * - Público (env) → sim
 * - Loja modelo + prévia ativa → sim (ainda mostra tag Em breve na UI)
 * - Demais → não
 */
export function isPagBankConnectAllowed({ slug, previewUnlocked = false }) {
  if (isPagBankPubliclyEnabled()) return true;
  if (isModelStoreSlug(slug) && previewUnlocked) return true;
  return false;
}

export function assertPagBankConnectAllowed({ slug, cookieHeader }) {
  const previewUnlocked = hasPagBankPreviewCookie(cookieHeader);
  if (isPagBankConnectAllowed({ slug, previewUnlocked })) return;
  const error = new Error(
    'PagBank ainda não está disponível. Aguarde a liberação após homologação.'
  );
  error.status = 403;
  throw error;
}
