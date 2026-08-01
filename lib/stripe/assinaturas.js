import { displayAssinaturaStatus, mapStripeSubscriptionStatus } from '@/lib/stripe/client';
import { planLabelFromAssinatura, resolvePlanByPriceId } from '@/lib/stripe/plans';

export function mapAssinaturaRow(row) {
  if (!row) {
    return {
      empresaId: null,
      status: 'none',
      statusLocal: null,
      display: displayAssinaturaStatus(null),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      trialEnd: null,
      carenciaInicio: null,
      carenciaFim: null,
      ultimoPagamentoEm: null,
      valorCentavos: null,
      planoCodigo: null,
      planoLabel: '—',
      updatedAt: null,
    };
  }

  const planoCodigo = row.plano_codigo || resolvePlanByPriceId(row.stripe_price_id)?.codigo || null;
  const mapped = {
    empresaId: row.empresa_id,
    status: mapStripeSubscriptionStatus(row.status),
    statusLocal: row.status_local || null,
    stripeCustomerId: row.stripe_customer_id || null,
    stripeSubscriptionId: row.stripe_subscription_id || null,
    stripePriceId: row.stripe_price_id || null,
    currentPeriodEnd: row.current_period_end || null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    trialEnd: row.trial_end || null,
    carenciaInicio: row.carencia_inicio || null,
    carenciaFim: row.carencia_fim || null,
    ultimoPagamentoEm: row.ultimo_pagamento_em || null,
    valorCentavos: row.valor_centavos ?? null,
    planoCodigo,
    planoLabel: planLabelFromAssinatura({
      planoCodigo,
      stripePriceId: row.stripe_price_id,
    }),
    updatedAt: row.updated_at || null,
  };
  mapped.display = displayAssinaturaStatus(mapped);
  return mapped;
}

export async function upsertAssinaturaFromSubscription(supabase, { empresaId, subscription, extra = {} }) {
  if (!supabase || !empresaId || !subscription) return null;

  const price = subscription.items?.data?.[0]?.price || null;
  const valorCentavos = typeof price?.unit_amount === 'number' ? price.unit_amount : extra.valor_centavos ?? null;
  const resolvedPlan = resolvePlanByPriceId(price?.id) || resolvePlanByPriceId(extra.stripe_price_id);

  const patch = {
    empresa_id: empresaId,
    stripe_customer_id:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id || extra.stripe_customer_id || null,
    stripe_subscription_id: subscription.id,
    stripe_price_id: price?.id || extra.stripe_price_id || null,
    status: mapStripeSubscriptionStatus(subscription.status),
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    valor_centavos: valorCentavos,
    plano_codigo: extra.plano_codigo || resolvedPlan?.codigo || null,
    updated_at: new Date().toISOString(),
    ...extra.patch,
  };

  if (extra.ultimo_pagamento_em) {
    patch.ultimo_pagamento_em = extra.ultimo_pagamento_em;
  }

  const { data, error } = await supabase
    .from('empresa_assinaturas')
    .upsert(patch, { onConflict: 'empresa_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function findEmpresaIdByStripeCustomer(supabase, customerId) {
  if (!customerId) return null;
  const { data, error } = await supabase
    .from('empresa_assinaturas')
    .select('empresa_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();
  if (error) throw error;
  return data?.empresa_id || null;
}

export async function findEmpresaIdBySubscription(supabase, subscriptionId) {
  if (!subscriptionId) return null;
  const { data, error } = await supabase
    .from('empresa_assinaturas')
    .select('empresa_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();
  if (error) throw error;
  return data?.empresa_id || null;
}

export async function appendAssinaturaEvent(supabase, { empresaId, tipo, resumo, payload }) {
  if (!supabase || !empresaId || !tipo) return;
  await supabase.from('empresa_assinatura_eventos').insert({
    empresa_id: empresaId,
    tipo,
    resumo: resumo || null,
    payload: payload || null,
  });
}

export async function appendTimelineEvent(supabase, { empresaId, tipo, titulo, detalhe, meta, autorUserId }) {
  if (!supabase || !empresaId || !tipo || !titulo) return;
  await supabase.from('empresa_timeline_eventos').insert({
    empresa_id: empresaId,
    tipo,
    titulo,
    detalhe: detalhe || null,
    meta: meta || null,
    autor_user_id: autorUserId || null,
  });
}

export function computeHealthScore({ activityStatus, assinatura, feedbackAbertos, onboardingPct, suspensa }) {
  let score = 70;
  if (suspensa) score -= 40;
  if (activityStatus === 'sem_pedido_recente') score -= 20;
  if (activityStatus === 'nova') score -= 5;
  const statusLocal = assinatura?.statusLocal || assinatura?.status_local || null;
  const status = assinatura?.status || 'none';
  if (statusLocal === 'cortesia') score += 5;
  else if (['past_due', 'unpaid'].includes(status)) score -= 25;
  else if (status === 'active') score += 10;
  else if (status === 'trialing') score += 5;
  else if (status === 'none') score -= 5;
  if (feedbackAbertos > 0) score -= Math.min(15, feedbackAbertos * 5);
  if (typeof onboardingPct === 'number') {
    if (onboardingPct < 40) score -= 10;
    else if (onboardingPct >= 80) score += 5;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}
