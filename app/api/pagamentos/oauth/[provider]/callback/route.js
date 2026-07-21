import { NextResponse } from 'next/server';
import { verifyOAuthState } from '@/lib/payments/crypto';
import { requirePaymentFeatureForEmpresa } from '@/lib/payments/paymentFeature';
import { exchangeMercadoPagoCode } from '@/lib/payments/providers/mercadoPago';
import { exchangePagBankCode } from '@/lib/payments/providers/pagbank';
import {
  getPaymentAccount,
  saveMercadoPagoAccount,
  savePagBankAccount,
} from '@/lib/payments/paymentServer';
import { getSiteOrigin } from '@/lib/siteUrl';
import { getAuthenticatedUser, requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

function integrationsUrl(status, message, provider = null) {
  const url = new URL('/admin/integracoes', getSiteOrigin());
  url.searchParams.set('payments', status);
  if (provider) url.searchParams.set('provider', provider);
  if (message) url.searchParams.set('message', message);
  return url;
}

function finishRedirect(status, message, provider) {
  const response = NextResponse.redirect(integrationsUrl(status, message, provider));
  response.cookies.delete(`nimbus_oauth_${provider}`);
  return response;
}

export async function GET(request, { params }) {
  const { provider } = await params;
  if (!['mercado_pago', 'pagbank'].includes(provider)) {
    return NextResponse.redirect(integrationsUrl('error', 'Provedor inválido.', provider));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');
  if (oauthError) {
    return finishRedirect('error', 'Autorização cancelada.', provider);
  }

  try {
    const signedState = request.cookies.get(`nimbus_oauth_${provider}`)?.value;
    const state = verifyOAuthState(signedState);
    if (!stateRaw || stateRaw !== state.nonce) {
      throw Object.assign(new Error('Estado OAuth inválido.'), { status: 401 });
    }
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
    if (existing && existing.provider !== provider) {
      throw new Error('Desconecte o provedor atual antes de conectar outro.');
    }

    const redirectUri = `${getSiteOrigin()}/api/pagamentos/oauth/${provider}/callback`;
    if (provider === 'pagbank') {
      const tokenData = await exchangePagBankCode({ code, redirectUri });
      await savePagBankAccount(supabase, empresa.id, tokenData);
    } else {
      const tokenData = await exchangeMercadoPagoCode({ code, redirectUri });
      await saveMercadoPagoAccount(supabase, empresa.id, {
        ...tokenData,
        connection_mode: 'oauth',
        live_mode: tokenData.live_mode !== false,
      });
    }
    return finishRedirect('connected', null, provider);
  } catch (error) {
    return finishRedirect(
      'error',
      error?.message || 'Não foi possível conectar o provedor.',
      provider
    );
  }
}
