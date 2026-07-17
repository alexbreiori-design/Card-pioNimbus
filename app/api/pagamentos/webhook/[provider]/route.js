import { NextResponse } from 'next/server';
import { verifyMercadoPagoWebhook } from '@/lib/payments/providers/mercadoPago';
import { syncMercadoPagoPayment } from '@/lib/payments/paymentServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request, { params }) {
  const { provider } = await params;
  if (provider !== 'mercado_pago') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
  const body = await request.json().catch(() => ({}));
  const url = new URL(request.url);
  const dataId =
    url.searchParams.get('data.id') ||
    url.searchParams.get('id') ||
    body?.data?.id ||
    body?.id;

  if (!dataId || !verifyMercadoPagoWebhook(request, dataId)) {
    return NextResponse.json({ ok: false, error: 'Assinatura inválida.' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  try {
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
