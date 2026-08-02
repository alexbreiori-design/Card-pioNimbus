/** Catálogo de planos Nimbus na Stripe (Billing). */

export const NIMBUS_STRIPE_PLANS = [
  {
    codigo: 'loja_nova',
    label: 'Loja Nova',
    descricao: 'Primeira loja / assinatura principal',
    valorCentavos: 14990,
    envKey: 'STRIPE_PRICE_LOJA_NOVA',
    fallbackEnvKey: 'STRIPE_PRICE_NIMBUS_COMPLETO',
  },
  {
    codigo: 'segunda_loja',
    label: 'Segunda Loja',
    descricao: 'Segunda unidade do mesmo cliente',
    valorCentavos: 11990,
    envKey: 'STRIPE_PRICE_SEGUNDA_LOJA',
  },
  {
    codigo: 'loja_complementar',
    label: 'Loja Complementar',
    descricao: 'Unidades adicionais',
    valorCentavos: 9990,
    envKey: 'STRIPE_PRICE_LOJA_COMPLEMENTAR',
  },
];

export function getPlanPriceId(codigo) {
  const plan = NIMBUS_STRIPE_PLANS.find((item) => item.codigo === codigo) || NIMBUS_STRIPE_PLANS[0];
  const primary = String(process.env[plan.envKey] || '').trim();
  if (primary) return primary;
  if (plan.fallbackEnvKey) {
    return String(process.env[plan.fallbackEnvKey] || '').trim() || null;
  }
  return null;
}

export function listConfiguredPlans() {
  return NIMBUS_STRIPE_PLANS.map((plan) => {
    const priceId = getPlanPriceId(plan.codigo);
    return {
      codigo: plan.codigo,
      label: plan.label,
      descricao: plan.descricao,
      valorCentavos: plan.valorCentavos,
      priceId,
      configured: Boolean(priceId),
    };
  }).filter((plan) => plan.configured);
}

export function resolvePlanByCodigo(codigo) {
  const code = String(codigo || '').trim();
  return NIMBUS_STRIPE_PLANS.find((item) => item.codigo === code) || null;
}

export function resolvePlanByPriceId(priceId) {
  const id = String(priceId || '').trim();
  if (!id) return null;
  for (const plan of NIMBUS_STRIPE_PLANS) {
    if (getPlanPriceId(plan.codigo) === id) return plan;
  }
  return null;
}

export function planLabelFromAssinatura({ planoCodigo, stripePriceId } = {}) {
  const byCode = resolvePlanByCodigo(planoCodigo);
  if (byCode) return byCode.label;
  const byPrice = resolvePlanByPriceId(stripePriceId);
  if (byPrice) return byPrice.label;
  if (planoCodigo) return String(planoCodigo);
  return '—';
}

/** Valida código de plano e devolve priceId + metadados. */
export function resolveCheckoutPlan(codigo) {
  const code = String(codigo || '').trim() || 'loja_nova';
  const plan = resolvePlanByCodigo(code) || NIMBUS_STRIPE_PLANS[0];
  const priceId = getPlanPriceId(plan.codigo);
  if (!priceId) {
    return { ok: false, error: `Price não configurado para o plano ${plan.label}.` };
  }
  return {
    ok: true,
    codigo: plan.codigo,
    label: plan.label,
    descricao: plan.descricao,
    valorCentavos: plan.valorCentavos,
    priceId,
  };
}
