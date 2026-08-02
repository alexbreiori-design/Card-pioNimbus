import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { getStripe } from '@/lib/stripe/client';
import { buildBillingPortalSessionParams } from '@/lib/stripe/carencia';
import { loadAssinaturaRow, resolveEmpresaForBilling } from '@/lib/superAdmin/billing';

export async function POST(_request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  try {
    await requireSuperAdmin();

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { ok: false, error: 'Stripe não configurado (STRIPE_SECRET_KEY ausente).' },
        { status: 503 }
      );
    }

    const empresa = await resolveEmpresaForBilling(supabase, safeSlug);
    if (!empresa) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const assinatura = await loadAssinaturaRow(supabase, empresa.id);
    if (!assinatura?.stripe_customer_id) {
      return NextResponse.json(
        { ok: false, error: 'Esta loja ainda não tem cliente Stripe. Gere um checkout primeiro.' },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create(
      buildBillingPortalSessionParams({
        customerId: assinatura.stripe_customer_id,
        returnPath: '/admin/sistema?view=comercial',
      })
    );

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao abrir portal do cliente.' },
      { status }
    );
  }
}
