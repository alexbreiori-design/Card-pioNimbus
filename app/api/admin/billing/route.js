import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { isAssinaturaUiEnabled } from '@/lib/features';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { mapAssinaturaRow } from '@/lib/stripe/assinaturas';
import { mapStripeSubscriptionStatus } from '@/lib/stripe/client';

const MANAGED_SUB_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid', 'paused']);

export async function GET(request) {
  const slug = normalizeSlug(new URL(request.url).searchParams.get('slug') || '');
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  try {
    await requireStoreAdmin(slug);
    const supabase = getServiceClient();
    if (!supabase) throw Object.assign(new Error('Serviço indisponível.'), { status: 503 });

    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('id, assinatura_nimbus_habilitada')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const enabled = isAssinaturaUiEnabled() && Boolean(empresa.assinatura_nimbus_habilitada);
    if (!enabled) {
      return NextResponse.json({
        ok: true,
        enabled: false,
        assinatura: null,
        needsCheckout: false,
        canOpenPortal: false,
        hasCarencia: false,
      });
    }

    const { data: row, error: assinaturaError } = await supabase
      .from('empresa_assinaturas')
      .select('*')
      .eq('empresa_id', empresa.id)
      .maybeSingle();
    if (assinaturaError) throw assinaturaError;

    const assinatura = mapAssinaturaRow(row);
    const status = mapStripeSubscriptionStatus(row?.status);
    const hasManagedSub =
      Boolean(row?.stripe_subscription_id) && MANAGED_SUB_STATUSES.has(status);
    const hasCarencia = assinatura.statusLocal === 'cortesia';

    return NextResponse.json({
      ok: true,
      enabled: true,
      assinatura,
      needsCheckout: !hasManagedSub,
      canOpenPortal: Boolean(assinatura.stripeCustomerId),
      hasCarencia,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar assinatura.' },
      { status: error?.status || 500 }
    );
  }
}
