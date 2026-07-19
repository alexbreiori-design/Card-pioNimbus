import { NextResponse } from 'next/server';
import { verifyAsaasWebhook } from '@/lib/payments/providers/asaas';
import { verifyMercadoPagoWebhook } from '@/lib/payments/providers/mercadoPago';
import {
  handleMercadoPagoConnectWebhook,
  syncAsaasPayment,
  syncMercadoPagoPayment,
} from '@/lib/payments/paymentServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request, { params }) {
  const { provider } = await params;
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  if (provider === 'asaas') {
    if (!verifyAsaasWebhook(request)) {
      return NextResponse.json({ ok: false, error: 'Token inválido.' }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const paymentId = body?.payment?.id || body?.id;
    if (!paymentId) return NextResponse.json({ ok: true });
    try {
      const { data: payment, error } = await supabase
        .from('pagamentos')
        .select('*')
        .eq('provider', 'asaas')
        .eq('provider_payment_id', String(paymentId))
        .maybeSingle();
      if (error) throw error;
      if (payment) await syncAsaasPayment(supabase, payment);
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  if (provider !== 'mercado_pago') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const url = new URL(request.url);
  const topic =
    url.searchParams.get('type') ||
    url.searchParams.get('topic') ||
    body?.type ||
    body?.topic ||
    '';
  const dataId =
    url.searchParams.get('data.id') ||
    url.searchParams.get('id') ||
    body?.data?.id ||
    body?.id;

  if (!dataId || !verifyMercadoPagoWebhook(request, dataId)) {
    return NextResponse.json({ ok: false, error: 'Assinatura inválida.' }, { status: 401 });
  }

  try {
    if (String(topic).toLowerCase() === 'mp-connect') {
      const action = String(body?.action || '');
      const userId = body?.user_id || body?.data?.id || dataId;
      await handleMercadoPagoConnectWebhook(supabase, { action, userId });
      return NextResponse.json({ ok: true, topic: 'mp-connect' });
    }

    const { data: payment, error } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('provider', 'mercado_pago')
      .eq('provider_payment_id', String(dataId))
      .maybeSingle();
    if (error) throw error;
    if (payment) await syncMercadoPagoPayment(supabase, payment);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
