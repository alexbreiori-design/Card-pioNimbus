import { NextResponse } from 'next/server';
import { verifyOAuthState } from '@/lib/payments/crypto';
import { requirePaymentFeatureForEmpresa } from '@/lib/payments/paymentFeature';
import { exchangeMercadoPagoCode } from '@/lib/payments/providers/mercadoPago';
import { getPaymentAccount, saveMercadoPagoAccount } from '@/lib/payments/paymentServer';
import { getSiteOrigin } from '@/lib/siteUrl';
import { getAuthenticatedUser, requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

function integrationsUrl(status, message) {
  const url = new URL('/admin/integracoes', getSiteOrigin());
  url.searchParams.set('payments', status);
  if (message) url.searchParams.set('message', message);
  return url;
}

export async function GET(request, { params }) {
  const { provider } = await params;
  if (provider !== 'mercado_pago') {
    return NextResponse.redirect(integrationsUrl('error', 'Provedor inválido.'));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return NextResponse.redirect(integrationsUrl('error', 'Autorização cancelada.'));
  }

  try {
    const state = verifyOAuthState(stateRaw);
    const user = await getAuthenticatedUser();
    if (!user || user.id !== state.userId) {
      throw Object.assign(new Error('Sessão inválida para concluir a conexão.'), { status: 401 });
    }
    await requireStoreAdmin(state.slug);
    if (!code) throw new Error('Código de autorização ausente.');

    const supabase = getServiceClient();
    if (!supabase) throw new Error('Serviço indisponível.');
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', state.slug)
      .single();
    if (empresaError) throw empresaError;
    await requirePaymentFeatureForEmpresa(supabase, empresa.id);

    const existing = await getPaymentAccount(supabase, empresa.id);
    if (existing && existing.provider !== 'mercado_pago') {
      throw new Error('Desconecte o provedor atual antes de conectar outro.');
    }

    const redirectUri = `${getSiteOrigin()}/api/pagamentos/oauth/mercado_pago/callback`;
    const tokenData = await exchangeMercadoPagoCode({ code, redirectUri });
    await saveMercadoPagoAccount(supabase, empresa.id, tokenData);
    return NextResponse.redirect(integrationsUrl('connected'));
  } catch (error) {
    return NextResponse.redirect(
      integrationsUrl('error', error?.message || 'Não foi possível conectar o Mercado Pago.')
    );
  }
}
