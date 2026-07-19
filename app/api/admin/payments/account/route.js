import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import {
  disconnectPaymentAccount,
  getPaymentAccount,
  saveAsaasAccount,
  saveMercadoPagoAccount,
} from '@/lib/payments/paymentServer';
import {
  isPaymentFeatureEnabledForEmpresa,
  requirePaymentFeatureForEmpresa,
} from '@/lib/payments/paymentFeature';
import { validateAsaasApiKey } from '@/lib/payments/providers/asaas';
import { validateMercadoPagoAccessToken } from '@/lib/payments/providers/mercadoPago';
import { allowsManualPaymentCredentials } from '@/lib/runtimeEnvironment';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

async function resolveEmpresa(supabase, slug) {
  const { data, error } = await supabase
    .from('empresas')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(request) {
  const slug = normalizeSlug(new URL(request.url).searchParams.get('slug') || '');
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }
  try {
    await requireStoreAdmin(slug);
    const supabase = getServiceClient();
    if (!supabase) throw Object.assign(new Error('Serviço indisponível.'), { status: 503 });
    const empresa = await resolveEmpresa(supabase, slug);
    if (!empresa) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }
    const enabled = await isPaymentFeatureEnabledForEmpresa(supabase, empresa.id);
    if (!enabled) {
      return NextResponse.json({ ok: true, enabled: false, account: null });
    }
    const account = await getPaymentAccount(supabase, empresa.id);
    let recentOrders = [];
    // Order IDs só para loja-teste (medição de qualidade / sandbox).
    if (account && allowsManualPaymentCredentials(slug)) {
      const { data: recent } = await supabase
        .from('pagamentos')
        .select('provider_payment_id, status, metodo, valor, created_at')
        .eq('empresa_id', empresa.id)
        .eq('provider', 'mercado_pago')
        .not('provider_payment_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(2);
      recentOrders = (recent || []).map((row) => ({
        orderId: row.provider_payment_id,
        status: row.status,
        method: row.metodo,
        amount: row.valor,
        createdAt: row.created_at,
      }));
    }
    return NextResponse.json({
      ok: true,
      enabled: true,
      account: account
        ? {
            provider: account.provider,
            status: account.status,
            methods: account.metodos || {},
            connectedAt: account.connected_at,
            liveMode: account.metadata?.live_mode !== false,
            connectionMode: account.metadata?.connection_mode || 'oauth',
          }
        : null,
      recentOrders,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar integração.' },
      { status: error?.status || 500 }
    );
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const slug = normalizeSlug(body.slug || '');
  const provider = String(body.provider || 'mercado_pago').trim();

  try {
    await requireStoreAdmin(slug);
    const supabase = getServiceClient();
    if (!supabase) throw Object.assign(new Error('Serviço indisponível.'), { status: 503 });
    const empresa = await resolveEmpresa(supabase, slug);
    if (!empresa) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }
    await requirePaymentFeatureForEmpresa(supabase, empresa.id);

    if (provider === 'asaas') {
      const apiKey = String(body.apiKey || body.accessToken || '').trim();
      const isSandbox = body.isSandbox === true || body.isTestCredentials === true;
      if (!apiKey) {
        return NextResponse.json({ ok: false, error: 'Informe a API Key do Asaas.' }, { status: 400 });
      }
      const { me, sandbox } = await validateAsaasApiKey(apiKey, { sandbox: isSandbox });
      const account = await saveAsaasAccount(supabase, empresa.id, {
        access_token: apiKey,
        user_id: me?.id || me?.person?.id || null,
        wallet_id: me?.walletId || null,
        account_name: me?.name || me?.companyName || null,
        live_mode: !sandbox,
        sandbox,
      });
      return NextResponse.json({
        ok: true,
        account: {
          provider: account.provider,
          status: account.status,
          methods: account.metodos || {},
          connectedAt: account.connected_at,
          liveMode: account.metadata?.live_mode !== false,
          connectionMode: account.metadata?.connection_mode || 'api_key',
        },
      });
    }

    if (provider !== 'mercado_pago') {
      return NextResponse.json({ ok: false, error: 'Provedor não suportado.' }, { status: 400 });
    }

    const accessToken = String(body.accessToken || '').trim();
    const publicKey = String(body.publicKey || '').trim();
    const isTestCredentials = body.isTestCredentials !== false;

    if (!allowsManualPaymentCredentials(slug)) {
      return NextResponse.json(
        { ok: false, error: 'Esta loja só pode conectar via OAuth.' },
        { status: 403 }
      );
    }
    if (!accessToken || !publicKey) {
      return NextResponse.json(
        { ok: false, error: 'Informe Access Token e Public Key.' },
        { status: 400 }
      );
    }

    const me = await validateMercadoPagoAccessToken(accessToken);
    const account = await saveMercadoPagoAccount(supabase, empresa.id, {
      access_token: accessToken,
      public_key: publicKey,
      refresh_token: null,
      user_id: me?.id || null,
      live_mode: !isTestCredentials,
      sandbox: isTestCredentials,
      connection_mode: isTestCredentials ? 'credentials_test' : 'credentials',
      scope: me?.nickname || null,
    });

    return NextResponse.json({
      ok: true,
      account: {
        provider: account.provider,
        status: account.status,
        methods: account.metodos || {},
        connectedAt: account.connected_at,
        liveMode: account.metadata?.live_mode !== false,
        connectionMode: account.metadata?.connection_mode || 'credentials',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao salvar credenciais.' },
      { status: error?.status || 500 }
    );
  }
}

export async function DELETE(request) {
  const body = await request.json().catch(() => ({}));
  const slug = normalizeSlug(body.slug || '');
  try {
    await requireStoreAdmin(slug);
    const supabase = getServiceClient();
    if (!supabase) throw Object.assign(new Error('Serviço indisponível.'), { status: 503 });
    const empresa = await resolveEmpresa(supabase, slug);
    if (!empresa) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }
    const provider = String(body.provider || 'mercado_pago').trim();
    if (!['mercado_pago', 'asaas'].includes(provider)) {
      return NextResponse.json({ ok: false, error: 'Provedor inválido.' }, { status: 400 });
    }
    await disconnectPaymentAccount(supabase, empresa.id, provider);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao desconectar integração.' },
      { status: error?.status || 500 }
    );
  }
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const slug = normalizeSlug(body.slug || '');
  try {
    await requireStoreAdmin(slug);
    const supabase = getServiceClient();
    if (!supabase) throw Object.assign(new Error('Serviço indisponível.'), { status: 503 });
    const empresa = await resolveEmpresa(supabase, slug);
    if (!empresa) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }
    await requirePaymentFeatureForEmpresa(supabase, empresa.id);
    const methods = {
      pix: body.methods?.pix !== false,
      credit_card: body.methods?.credit_card !== false,
    };
    if (!methods.pix && !methods.credit_card) {
      return NextResponse.json(
        { ok: false, error: 'Mantenha ao menos um método online ativo.' },
        { status: 400 }
      );
    }
    const { error } = await supabase
      .from('empresa_pagamento_contas')
      .update({ metodos: methods, updated_at: new Date().toISOString() })
      .eq('empresa_id', empresa.id)
      .eq('status', 'ativo');
    if (error) throw error;
    return NextResponse.json({ ok: true, methods });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar integração.' },
      { status: error?.status || 500 }
    );
  }
}
