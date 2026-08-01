import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { isAssinaturaUiEnabled } from '@/lib/features';
import { getSiteOrigin } from '@/lib/siteUrl';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { resolveCheckoutPlan } from '@/lib/stripe/plans';
import { mapStripeSubscriptionStatus } from '@/lib/stripe/client';
import {
  carenciaFimToTrialEndUnix,
  createBillingCheckoutSession,
  toDateOnlyIso,
} from '@/lib/stripe/carencia';
import {
  ensureStripeCustomer,
  loadAssinaturaRow,
  resolveOwnerEmail,
} from '@/lib/superAdmin/billing';

const MANAGED_SUB_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const slug = normalizeSlug(body.slug || '');
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  try {
    await requireStoreAdmin(slug);

    if (!isAssinaturaUiEnabled()) {
      return NextResponse.json({ ok: false, error: 'Assinatura indisponível.' }, { status: 403 });
    }

    const supabase = getServiceClient();
    if (!supabase) throw Object.assign(new Error('Serviço indisponível.'), { status: 503 });

    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('id, slug, nome, email, assinatura_nimbus_habilitada')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!empresa?.id || !empresa.assinatura_nimbus_habilitada) {
      return NextResponse.json(
        { ok: false, error: 'Assinatura indisponível para esta loja.' },
        { status: 403 }
      );
    }

    const existing = await loadAssinaturaRow(supabase, empresa.id);
    const status = mapStripeSubscriptionStatus(existing?.status);
    if (existing?.stripe_subscription_id && MANAGED_SUB_STATUSES.has(status)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Já existe uma assinatura em andamento. Use o portal para gerenciar.',
        },
        { status: 409 }
      );
    }

    const plan = resolveCheckoutPlan(existing?.plano_codigo || 'loja_nova');
    if (!plan.ok) {
      return NextResponse.json({ ok: false, error: plan.error }, { status: 400 });
    }

    const hasCarencia =
      existing?.status_local === 'cortesia' && Boolean(toDateOnlyIso(existing?.carencia_fim));
    const trialEndUnix = hasCarencia ? carenciaFimToTrialEndUnix(existing.carencia_fim) : null;

    const ownerEmail = await resolveOwnerEmail(supabase, empresa.id, empresa.email);
    const customerId = await ensureStripeCustomer(supabase, {
      empresaId: empresa.id,
      slug: empresa.slug,
      nome: empresa.nome,
      ownerEmail,
      existingCustomerId: existing?.stripe_customer_id,
    });

    const origin = getSiteOrigin();
    const session = await createBillingCheckoutSession({
      empresa,
      customerId,
      plan,
      trialPeriodDays: null,
      trialEndUnix,
      carencia: hasCarencia && Boolean(trialEndUnix),
      successUrl: `${origin}/admin/integracoes?billing=sucesso`,
      cancelUrl: `${origin}/admin/integracoes?billing=cancelado`,
    });

    await supabase.from('empresa_assinaturas').upsert(
      {
        empresa_id: empresa.id,
        stripe_customer_id: customerId,
        stripe_price_id: plan.priceId,
        plano_codigo: plan.codigo,
        valor_centavos: plan.valorCentavos,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'empresa_id' }
    );

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao criar checkout.' },
      { status: error?.status || 500 }
    );
  }
}
