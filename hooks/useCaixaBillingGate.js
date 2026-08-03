import { CAIXA_BILLING_MESSAGES } from '@/lib/stripe/billingGates';

export async function fetchCaixaBillingGate(slug) {
  if (!slug) {
    return {
      enabled: false,
      blocked: false,
      warning: 'none',
      daysLeft: null,
      code: null,
      message: null,
    };
  }

  const response = await fetch(`/api/admin/billing?slug=${encodeURIComponent(slug)}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    return {
      enabled: false,
      blocked: false,
      warning: 'none',
      daysLeft: null,
      code: null,
      message: null,
    };
  }

  return (
    payload.caixaGate || {
      enabled: Boolean(payload.enabled),
      blocked: false,
      warning: 'none',
      daysLeft: null,
      code: null,
      message: null,
    }
  );
}

function warningStorageKey(slug, warning) {
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  return `nimbus:carencia-warn:${slug}:${day}:${warning}`;
}

export function hasShownCarenciaWarning(slug, warning) {
  if (!slug || !warning || warning === 'none' || typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(warningStorageKey(slug, warning)) === '1';
  } catch {
    return false;
  }
}

export function markCarenciaWarningShown(slug, warning) {
  if (!slug || !warning || warning === 'none' || typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(warningStorageKey(slug, warning), '1');
  } catch {
    /* ignore */
  }
}

export function resolveWarningMessage(warning, fallback) {
  if (warning === 'three_days') return CAIXA_BILLING_MESSAGES.three_days;
  if (warning === 'last_day') return CAIXA_BILLING_MESSAGES.last_day;
  return fallback || null;
}
