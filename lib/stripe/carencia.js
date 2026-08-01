import { getStripe } from '@/lib/stripe/client';
import { resolveCheckoutPlan } from '@/lib/stripe/plans';
import { getSiteOrigin } from '@/lib/siteUrl';
import {
  ensureStripeCustomer,
  loadAssinaturaRow,
  resolveOwnerEmail,
} from '@/lib/superAdmin/billing';
import { appendTimelineEvent } from '@/lib/stripe/assinaturas';

export const CARENCIA_MODO_7DIAS = '7dias';
export const CARENCIA_MODO_PERSONALIZADO = 'personalizado';
export const TRIAL_PADRAO_DIAS = 7;

/** Data de hoje em America/Sao_Paulo (YYYY-MM-DD). */
export function todaySaoPaulo() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/** Soma dias em um YYYY-MM-DD sem depender do fuso do servidor. */
export function addDaysDateOnly(dateStr, days) {
  const day = String(dateStr || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
  return dt.toISOString().slice(0, 10);
}

export function daysBetweenDateOnly(inicio, fim) {
  const a = String(inicio || '').slice(0, 10);
  const b = String(fim || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) return null;
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ms =
    Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/** Fim do dia em America/Sao_Paulo → Unix seconds (Stripe trial_end). */
export function carenciaFimToTrialEndUnix(dateStr) {
  const day = String(dateStr || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  // 23:59:59 em SP ≈ UTC-3 (sem DST no Brasil desde 2019)
  const end = new Date(`${day}T23:59:59-03:00`);
  const unix = Math.floor(end.getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  // Stripe exige trial_end no futuro (margem ~2 min)
  if (unix <= now + 120) return null;
  return unix;
}

export function toDateOnlyIso(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  try {
    return new Date(raw).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  } catch {
    return null;
  }
}

/**
 * Resolve início/fim a partir do modo de carência do HQ.
 * @returns {{ inicio: string, fim: string, trialPeriodDays: number|null, trialEndUnix: number|null }}
 */
export function resolveCarenciaPeriod({ enabled, modo, carenciaInicio, carenciaFim } = {}) {
  if (!enabled) {
    return { inicio: null, fim: null, trialPeriodDays: null, trialEndUnix: null };
  }

  const mode = modo === CARENCIA_MODO_PERSONALIZADO ? CARENCIA_MODO_PERSONALIZADO : CARENCIA_MODO_7DIAS;

  if (mode === CARENCIA_MODO_7DIAS) {
    const inicio = todaySaoPaulo();
    const fim = addDaysDateOnly(inicio, TRIAL_PADRAO_DIAS);
    return {
      inicio,
      fim,
      trialPeriodDays: TRIAL_PADRAO_DIAS,
      trialEndUnix: carenciaFimToTrialEndUnix(fim),
      modo: CARENCIA_MODO_7DIAS,
    };
  }

  const inicio = toDateOnlyIso(carenciaInicio) || todaySaoPaulo();
  const fim = toDateOnlyIso(carenciaFim);
  if (!fim) {
    throw Object.assign(new Error('Informe a data de término da carência.'), { status: 400 });
  }
  if (fim < inicio) {
    throw Object.assign(new Error('O término da carência deve ser após o início.'), { status: 400 });
  }
  const trialEndUnix = carenciaFimToTrialEndUnix(fim);
  if (!trialEndUnix) {
    throw Object.assign(
      new Error('A data de término precisa ser no futuro (pelo menos alguns minutos à frente).'),
      { status: 400 }
    );
  }
  return {
    inicio,
    fim,
    trialPeriodDays: null,
    trialEndUnix,
    modo: CARENCIA_MODO_PERSONALIZADO,
  };
}

function buildSubscriptionDataTrial({ trialPeriodDays, trialEndUnix, metadata }) {
  const subscriptionData = { metadata: metadata || {} };
  if (trialPeriodDays) {
    subscriptionData.trial_period_days = trialPeriodDays;
  } else if (trialEndUnix) {
    subscriptionData.trial_end = trialEndUnix;
  }
  return subscriptionData;
}

/**
 * Ativa/atualiza carência local + tenta espelhar no Stripe via trial.
 * Por padrão não cria Checkout — use createBillingCheckoutSession para o link.
 */
export async function applyCarencia(supabase, {
  empresa,
  admin,
  carenciaInicio,
  carenciaFim,
  planoCodigo,
  trialPeriodDays = null,
  clear = false,
  createCheckout = false,
}) {
  const existing = await loadAssinaturaRow(supabase, empresa.id);

  if (clear) {
    const { data, error } = await supabase
      .from('empresa_assinaturas')
      .upsert(
        {
          empresa_id: empresa.id,
          status_local: null,
          carencia_inicio: null,
          carencia_fim: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'empresa_id' }
      )
      .select('*')
      .single();
    if (error) throw error;

    await appendTimelineEvent(supabase, {
      empresaId: empresa.id,
      tipo: 'carencia_removida',
      titulo: 'Carência removida',
      detalhe: `Removida por ${admin?.email || 'super-admin'}.`,
      autorUserId: admin?.id || null,
    });

    return { row: data, checkoutUrl: null, stripeMode: 'cleared' };
  }

  const inicio = toDateOnlyIso(carenciaInicio) || todaySaoPaulo();
  const fim = toDateOnlyIso(carenciaFim);
  if (!fim) {
    throw Object.assign(new Error('Informe a data de término da carência.'), { status: 400 });
  }
  if (fim < inicio) {
    throw Object.assign(new Error('O término da carência deve ser após o início.'), { status: 400 });
  }

  const plan = resolveCheckoutPlan(planoCodigo || existing?.plano_codigo || 'loja_nova');
  if (!plan.ok) {
    throw Object.assign(new Error(plan.error), { status: 400 });
  }

  const trialEndUnix = carenciaFimToTrialEndUnix(fim);
  if (!trialEndUnix && !trialPeriodDays) {
    throw Object.assign(
      new Error('A data de término precisa ser no futuro (pelo menos alguns minutos à frente).'),
      { status: 400 }
    );
  }

  const ownerEmail = await resolveOwnerEmail(supabase, empresa.id, empresa.email);
  const customerId = await ensureStripeCustomer(supabase, {
    empresaId: empresa.id,
    slug: empresa.slug,
    nome: empresa.nome,
    ownerEmail,
    existingCustomerId: existing?.stripe_customer_id,
  });

  const stripe = getStripe();
  let checkoutUrl = null;
  let stripeMode = 'local_only';
  let subscriptionId = existing?.stripe_subscription_id || null;

  const trialMeta = {
    empresa_id: empresa.id,
    slug: empresa.slug,
    plano_codigo: plan.codigo,
    carencia: '1',
  };

  if (stripe) {
    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        if (sub && !String(sub.status || '').includes('canceled')) {
          const updatePayload = {
            proration_behavior: 'none',
            metadata: {
              ...(sub.metadata || {}),
              ...trialMeta,
            },
          };
          if (trialPeriodDays) {
            // Stripe update aceita trial_end; calcula a partir de agora + N dias
            const endFromDays = Math.floor(Date.now() / 1000) + trialPeriodDays * 24 * 60 * 60;
            updatePayload.trial_end = Math.max(endFromDays, trialEndUnix || endFromDays);
          } else {
            updatePayload.trial_end = trialEndUnix;
          }
          await stripe.subscriptions.update(subscriptionId, updatePayload);
          stripeMode = 'subscription_trial_updated';
        } else {
          subscriptionId = null;
        }
      } catch {
        subscriptionId = null;
      }
    }

    if (!subscriptionId && createCheckout) {
      const session = await createBillingCheckoutSession({
        empresa,
        customerId,
        plan,
        trialPeriodDays,
        trialEndUnix: trialPeriodDays ? null : trialEndUnix,
        carencia: true,
      });
      checkoutUrl = session.url;
      stripeMode = 'checkout_with_trial';
    }
  }

  const trialEndIso = trialEndUnix
    ? new Date(trialEndUnix * 1000).toISOString()
    : trialPeriodDays
      ? new Date(Date.now() + trialPeriodDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { data, error } = await supabase
    .from('empresa_assinaturas')
    .upsert(
      {
        empresa_id: empresa.id,
        stripe_customer_id: customerId,
        stripe_price_id: plan.priceId,
        plano_codigo: plan.codigo,
        valor_centavos: plan.valorCentavos,
        status_local: 'cortesia',
        carencia_inicio: `${inicio}T00:00:00-03:00`,
        carencia_fim: `${fim}T23:59:59-03:00`,
        trial_end: trialEndIso,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'empresa_id' }
    )
    .select('*')
    .single();
  if (error) throw error;

  await appendTimelineEvent(supabase, {
    empresaId: empresa.id,
    tipo: 'carencia_ativada',
    titulo: 'Carência ativada',
    detalhe: `${inicio} → ${fim} · plano ${plan.label} · por ${admin?.email || 'super-admin'}.`,
    autorUserId: admin?.id || null,
    meta: {
      carencia_inicio: inicio,
      carencia_fim: fim,
      plano_codigo: plan.codigo,
      stripe_mode: stripeMode,
      trial_period_days: trialPeriodDays || null,
    },
  });

  return { row: data, checkoutUrl, stripeMode, plan };
}

/** Persiste plano + carência (ou remoção) a partir do formulário do HQ. */
export async function salvarAcoesBilling(supabase, {
  empresa,
  admin,
  planoCodigo,
  carenciaEnabled,
  carenciaModo,
  carenciaInicio,
  carenciaFim,
}) {
  const plan = resolveCheckoutPlan(planoCodigo);
  if (!plan.ok) {
    throw Object.assign(new Error(plan.error), { status: 400 });
  }

  const existing = await loadAssinaturaRow(supabase, empresa.id);

  if (!carenciaEnabled) {
    const hadCarencia = existing?.status_local === 'cortesia';
    const { data, error } = await supabase
      .from('empresa_assinaturas')
      .upsert(
        {
          empresa_id: empresa.id,
          stripe_customer_id: existing?.stripe_customer_id || null,
          stripe_price_id: plan.priceId,
          plano_codigo: plan.codigo,
          valor_centavos: plan.valorCentavos,
          status_local: null,
          carencia_inicio: null,
          carencia_fim: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'empresa_id' }
      )
      .select('*')
      .single();
    if (error) throw error;

    if (hadCarencia) {
      await appendTimelineEvent(supabase, {
        empresaId: empresa.id,
        tipo: 'carencia_removida',
        titulo: 'Carência removida',
        detalhe: `Removida ao salvar ações por ${admin?.email || 'super-admin'}.`,
        autorUserId: admin?.id || null,
      });
    } else {
      await appendTimelineEvent(supabase, {
        empresaId: empresa.id,
        tipo: 'plano_atualizado',
        titulo: `Plano ${plan.label} salvo`,
        detalhe: `Sem carência · por ${admin?.email || 'super-admin'}.`,
        autorUserId: admin?.id || null,
        meta: { plano_codigo: plan.codigo },
      });
    }

    return { row: data, stripeMode: hadCarencia ? 'cleared' : 'plan_saved', plan, carencia: null };
  }

  const period = resolveCarenciaPeriod({
    enabled: true,
    modo: carenciaModo,
    carenciaInicio,
    carenciaFim,
  });

  const result = await applyCarencia(supabase, {
    empresa,
    admin,
    carenciaInicio: period.inicio,
    carenciaFim: period.fim,
    planoCodigo: plan.codigo,
    trialPeriodDays: period.trialPeriodDays,
    createCheckout: false,
  });

  return {
    ...result,
    carencia: {
      enabled: true,
      modo: period.modo,
      inicio: period.inicio,
      fim: period.fim,
    },
  };
}

/** Params para Billing Portal (locale, return_url, configuration opcional). */
export function buildBillingPortalSessionParams({
  customerId,
  returnPath = '/admin/integracoes',
} = {}) {
  const path = String(returnPath || '/admin/integracoes').startsWith('/')
    ? String(returnPath || '/admin/integracoes')
    : `/${returnPath}`;
  const params = {
    customer: customerId,
    return_url: `${getSiteOrigin()}${path}`,
    locale: 'pt-BR',
  };
  const configurationId = String(process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID || '').trim();
  if (configurationId) {
    params.configuration = configurationId;
  }
  return params;
}

/** Cria Checkout Session Stripe com trial opcional (para copiar/enviar ao cliente). */
export async function createBillingCheckoutSession({
  empresa,
  customerId,
  plan,
  trialPeriodDays = null,
  trialEndUnix = null,
  carencia = false,
  returnView = 'comercial',
  successUrl = null,
  cancelUrl = null,
}) {
  const stripe = getStripe();
  if (!stripe) {
    throw Object.assign(new Error('Stripe não configurado (STRIPE_SECRET_KEY ausente).'), {
      status: 503,
    });
  }

  const returnUrl = `${getSiteOrigin()}/admin/sistema?view=${returnView}`;
  const meta = {
    empresa_id: empresa.id,
    slug: empresa.slug,
    plano_codigo: plan.codigo,
    ...(carencia || trialPeriodDays || trialEndUnix ? { carencia: '1' } : {}),
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url:
      successUrl ||
      `${returnUrl}&checkout=sucesso&loja=${encodeURIComponent(empresa.slug)}${
        carencia || trialPeriodDays || trialEndUnix ? '&carencia=1' : ''
      }`,
    cancel_url:
      cancelUrl ||
      `${returnUrl}&checkout=cancelado&loja=${encodeURIComponent(empresa.slug)}`,
    client_reference_id: empresa.id,
    metadata: meta,
    subscription_data: buildSubscriptionDataTrial({
      trialPeriodDays,
      trialEndUnix,
      metadata: meta,
    }),
    locale: 'pt-BR',
  });

  return session;
}

/** Expira carências vencidas no espelho local (Stripe trial cuida da cobrança). */
export async function expireDueCarencias(supabase) {
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from('empresa_assinaturas')
    .select('empresa_id, carencia_fim, stripe_subscription_id, status, status_local')
    .eq('status_local', 'cortesia')
    .not('carencia_fim', 'is', null)
    .lte('carencia_fim', nowIso);
  if (error) throw error;

  const results = [];
  for (const row of rows || []) {
    const { data: updated, error: updError } = await supabase
      .from('empresa_assinaturas')
      .update({
        status_local: null,
        updated_at: nowIso,
      })
      .eq('empresa_id', row.empresa_id)
      .select('*')
      .maybeSingle();
    if (updError) {
      results.push({ empresaId: row.empresa_id, ok: false, error: updError.message });
      continue;
    }

    await appendTimelineEvent(supabase, {
      empresaId: row.empresa_id,
      tipo: 'carencia_encerrada',
      titulo: 'Carência encerrada',
      detalhe: 'Período de carência terminou — assinatura passa a vigorar.',
      meta: { carencia_fim: row.carencia_fim },
    });

    results.push({ empresaId: row.empresa_id, ok: true, row: updated });
  }

  return results;
}
