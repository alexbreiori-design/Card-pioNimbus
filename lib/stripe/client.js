import Stripe from 'stripe';
import { getPlanPriceId } from '@/lib/stripe/plans';

let stripeSingleton = null;

export function getStripe() {
  const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: '2026-06-24.dahlia',
    });
  }
  return stripeSingleton;
}

/** Price padrão do checkout HQ (Loja Nova). */
export function getNimbusPriceId() {
  return getPlanPriceId('loja_nova');
}

export function mapStripeSubscriptionStatus(status) {
  const value = String(status || '').trim();
  const allowed = new Set([
    'none',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
  ]);
  return allowed.has(value) ? value : 'none';
}

export function displayAssinaturaStatus(row) {
  if (!row) return { id: 'none', label: 'Sem assinatura' };
  if (row.status_local === 'cortesia' || row.statusLocal === 'cortesia') {
    return { id: 'cortesia', label: 'Em carência' };
  }
  const map = {
    none: 'Sem assinatura',
    trialing: 'Trial',
    active: 'Ativo',
    past_due: 'Em atraso',
    unpaid: 'Não pago',
    canceled: 'Cancelado',
    incomplete: 'Incompleto',
    incomplete_expired: 'Expirado',
    paused: 'Pausado',
  };
  return { id: row.status || 'none', label: map[row.status] || row.status };
}
