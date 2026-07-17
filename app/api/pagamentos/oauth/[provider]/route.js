import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { normalizeSlug } from '@/lib/normalize';
import { signOAuthState } from '@/lib/payments/crypto';
import { requirePaymentFeatureForEmpresa } from '@/lib/payments/paymentFeature';
import { getMercadoPagoAuthorizationUrl } from '@/lib/payments/providers/mercadoPago';
import { getSiteOrigin } from '@/lib/siteUrl';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request, { params }) {
  const { provider } = await params;
  const slug = normalizeSlug(new URL(request.url).searchParams.get('slug') || '');
  if (provider !== 'mercado_pago') {
    return NextResponse.json({ ok: false, error: 'Provedor indisponível.' }, { status: 404 });
  }
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  try {
    const user = await requireStoreAdmin(slug);
    const supabase = getServiceClient();
    if (!supabase) throw Object.assign(new Error('Serviço indisponível.'), { status: 503 });
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
    }
    await requirePaymentFeatureForEmpresa(supabase, empresa.id);

    const state = signOAuthState({
      slug,
      userId: user.id,
      nonce: randomUUID(),
      exp: Date.now() + 10 * 60 * 1000,
    });
    const redirectUri = `${getSiteOrigin()}/api/pagamentos/oauth/mercado_pago/callback`;
    return NextResponse.redirect(
      getMercadoPagoAuthorizationUrl({ redirectUri, state })
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao iniciar conexão.' },
      { status: error?.status || 500 }
    );
  }
}
