import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import {
  disconnectPaymentAccount,
  getPaymentAccount,
} from '@/lib/payments/paymentServer';
import {
  isPaymentFeatureEnabledForEmpresa,
  requirePaymentFeatureForEmpresa,
} from '@/lib/payments/paymentFeature';
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
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar integração.' },
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
    await disconnectPaymentAccount(supabase, empresa.id, 'mercado_pago');
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
      .eq('provider', 'mercado_pago')
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
