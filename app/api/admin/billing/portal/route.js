import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { isAssinaturaUiEnabled } from '@/lib/features';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { getStripe } from '@/lib/stripe/client';
import { buildBillingPortalSessionParams } from '@/lib/stripe/carencia';

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
      .select('id, assinatura_nimbus_habilitada')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!empresa?.id || !empresa.assinatura_nimbus_habilitada) {
      return NextResponse.json(
        { ok: false, error: 'Assinatura indisponível para esta loja.' },
        { status: 403 }
      );
    }

    const { data: assinatura, error: assinaturaError } = await supabase
      .from('empresa_assinaturas')
      .select('stripe_customer_id')
      .eq('empresa_id', empresa.id)
      .maybeSingle();
    if (assinaturaError) throw assinaturaError;
    if (!assinatura?.stripe_customer_id) {
      return NextResponse.json(
        { ok: false, error: 'Nenhuma assinatura encontrada para esta loja.' },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    if (!stripe) throw Object.assign(new Error('Stripe não configurado.'), { status: 503 });

    const session = await stripe.billingPortal.sessions.create(
      buildBillingPortalSessionParams({
        customerId: assinatura.stripe_customer_id,
        returnPath: '/admin/integracoes',
      })
    );

    return NextResponse.json({ ok: true, url: session.url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao abrir o portal de cobrança.' },
      { status: error?.status || 500 }
    );
  }
}
