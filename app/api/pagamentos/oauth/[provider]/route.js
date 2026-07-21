import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { normalizeSlug } from '@/lib/normalize';
import { signOAuthState } from '@/lib/payments/crypto';
import { requirePaymentFeatureForEmpresa } from '@/lib/payments/paymentFeature';
import { getMercadoPagoAuthorizationUrl } from '@/lib/payments/providers/mercadoPago';
import { getPagBankAuthorizationUrl } from '@/lib/payments/providers/pagbank';
import { getSiteOrigin } from '@/lib/siteUrl';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request, { params }) {
  const { provider } = await params;
  const slug = normalizeSlug(new URL(request.url).searchParams.get('slug') || '');
  if (!['mercado_pago', 'pagbank'].includes(provider)) {
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

    const nonce = randomBytes(16).toString('hex');
    const signedState = signOAuthState({
      slug,
      userId: user.id,
      nonce,
      exp: Date.now() + 10 * 60 * 1000,
    });
    const redirectUri = `${getSiteOrigin()}/api/pagamentos/oauth/${provider}/callback`;
    const authorizationUrl =
      provider === 'pagbank'
        ? getPagBankAuthorizationUrl({ redirectUri, state: nonce })
        : getMercadoPagoAuthorizationUrl({ redirectUri, state: nonce });
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(`nimbus_oauth_${provider}`, signedState, {
      httpOnly: true,
      secure: new URL(getSiteOrigin()).protocol === 'https:',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: `/api/pagamentos/oauth/${provider}/callback`,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao iniciar conexão.' },
      { status: error?.status || 500 }
    );
  }
}
