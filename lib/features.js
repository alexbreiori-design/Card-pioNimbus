/** Feature flags Nimbus (admin / HQ). */

/** Avaliações internas desligadas até integração útil para o lojista. */
export const STORE_REVIEWS_UI_ENABLED = false;

/**
 * Kill switch do bloco Assinatura no admin do lojista.
 * Ligar em local/staging via NIMBUS_ASSINATURA_UI_ENABLED=true.
 * Em prod fica false mesmo após ship do código.
 */
export function isAssinaturaUiEnabled() {
  const raw = String(process.env.NIMBUS_ASSINATURA_UI_ENABLED || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

/** Client-safe mirror (NEXT_PUBLIC_). Prefer server check when possible. */
export const NIMBUS_ASSINATURA_UI_ENABLED =
  String(process.env.NEXT_PUBLIC_NIMBUS_ASSINATURA_UI_ENABLED || '').trim().toLowerCase() ===
    'true' ||
  String(process.env.NEXT_PUBLIC_NIMBUS_ASSINATURA_UI_ENABLED || '').trim() === '1';
