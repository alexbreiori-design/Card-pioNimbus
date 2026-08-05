import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getSiteOrigin } from '@/lib/siteUrl';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { getStripe } from '@/lib/stripe/client';
import { resolveCheckoutPlan } from '@/lib/stripe/plans';
import { appendTimelineEvent } from '@/lib/stripe/assinaturas';
import {
  createBillingCheckoutSession,
  resolveCarenciaPeriod,
  todaySaoPaulo,
} from '@/lib/stripe/carencia';
import {
  ensureStripeCustomer,
  loadAssinaturaRow,
  resolveEmpresaForBilling,
  resolveOwnerEmail,
} from '@/lib/superAdmin/billing';

export async function POST(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const admin = await requireSuperAdmin();

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: 'Stripe não configurado (STRIPE_SECRET_KEY ausente).' },
        { status: 503 }
      );
    }

    const plan = resolveCheckoutPlan(body.planoCodigo || body.plano || body.priceCodigo);
    if (!plan.ok) {
      return NextResponse.json({ ok: false, error: plan.error }, { status: 400 });
    }

    const empresa = await resolveEmpresaForBilling(supabase, safeSlug);
    if (!empresa) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const carenciaPayload = body.carencia && typeof body.carencia === 'object' ? body.carencia : {};
    const carenciaEnabled = Boolean(
      body.carenciaEnabled ?? body.carencia_enabled ?? carenciaPayload.enabled
    );

    let period = { inicio: null, fim: null, trialPeriodDays: null, trialEndUnix: null, modo: null };
    if (carenciaEnabled) {
      period = resolveCarenciaPeriod({
        enabled: true,
        modo: body.carenciaModo || body.carencia_modo || carenciaPayload.modo,
        carenciaInicio:
          body.carencia_inicio ||
          body.carenciaInicio ||
          carenciaPayload.inicio ||
          carenciaPayload.carencia_inicio,
        carenciaFim:
          body.carencia_fim ||
          body.carenciaFim ||
          carenciaPayload.fim ||
          carenciaPayload.carencia_fim,
      });
    }

    const assinatura = await loadAssinaturaRow(supabase, empresa.id);
    const ownerEmail = await resolveOwnerEmail(supabase, empresa.id, empresa.email);
    const customerId = await ensureStripeCustomer(supabase, {
      empresaId: empresa.id,
      slug: empresa.slug,
      nome: empresa.nome,
      ownerEmail,
      existingCustomerId: assinatura?.stripe_customer_id,
    });

    const session = await createBillingCheckoutSession({
      empresa,
      customerId,
      plan,
      trialPeriodDays: period.trialPeriodDays,
      trialEndUnix: period.trialEndUnix,
      carencia: carenciaEnabled,
    });

    const upsertPayload = {
      empresa_id: empresa.id,
      stripe_customer_id: customerId,
      stripe_price_id: plan.priceId,
      plano_codigo: plan.codigo,
      valor_centavos: plan.valorCentavos,
      updated_at: new Date().toISOString(),
    };

    if (carenciaEnabled && period.inicio && period.fim) {
      upsertPayload.status_local = 'cortesia';
      upsertPayload.carencia_inicio = `${period.inicio}T00:00:00-03:00`;
      upsertPayload.carencia_fim = `${period.fim}T23:59:59-03:00`;
      upsertPayload.trial_end = period.trialEndUnix
        ? new Date(period.trialEndUnix * 1000).toISOString()
        : period.trialPeriodDays
          ? new Date(Date.now() + period.trialPeriodDays * 24 * 60 * 60 * 1000).toISOString()
          : null;
    }

    await supabase.from('empresa_assinaturas').upsert(upsertPayload, { onConflict: 'empresa_id' });

    await appendTimelineEvent(supabase, {
      empresaId: empresa.id,
      tipo: 'assinatura_checkout_criado',
      titulo: `Checkout ${plan.label} criado`,
      detalhe: carenciaEnabled
        ? `Link com carência (${period.modo === '7dias' ? '7 dias' : `${period.inicio} → ${period.fim}`}) · por ${admin.email || 'super-admin'}.`
        : `Link gerado por ${admin.email || 'super-admin'} · ${plan.label}.`,
      autorUserId: admin.id,
      meta: {
        plano_codigo: plan.codigo,
        price_id: plan.priceId,
        carencia: carenciaEnabled,
        carencia_modo: period.modo || null,
        trial_period_days: period.trialPeriodDays || null,
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
      origin: getSiteOrigin(),
      geradoEm: todaySaoPaulo(),
      plano: {
        codigo: plan.codigo,
        label: plan.label,
        priceId: plan.priceId,
        valorCentavos: plan.valorCentavos,
      },
      carencia: carenciaEnabled
        ? {
            enabled: true,
            modo: period.modo,
            inicio: period.inicio,
            fim: period.fim,
            trialPeriodDays: period.trialPeriodDays,
          }
        : { enabled: false },
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao criar checkout.' },
      { status }
    );
  }
}
