import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { getPaymentAccount } from '@/lib/payments/paymentServer';
import { isPaymentFeatureEnabledForEmpresa } from '@/lib/payments/paymentFeature';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request) {
  const slug = normalizeSlug(new URL(request.url).searchParams.get('slug') || '');
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }
  try {
    const { data: empresa, error } = await supabase
      .from('empresas')
      .select('id, suspensa')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!empresa || empresa.suspensa) {
      return NextResponse.json({ ok: true, account: null });
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
            publicKey: account.public_key,
            methods: account.metodos || {},
            sandbox: account.metadata?.live_mode === false || String(account.public_key || '').startsWith('TEST-'),
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao consultar pagamentos.' },
      { status: 500 }
    );
  }
}
