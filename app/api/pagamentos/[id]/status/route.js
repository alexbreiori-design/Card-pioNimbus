import { NextResponse } from 'next/server';
import { checkoutTokenMatches } from '@/lib/payments/crypto';
import { syncMercadoPagoPayment } from '@/lib/payments/paymentServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request, { params }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get('token') || '';
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }
  try {
    const { data: payment, error } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!payment || !checkoutTokenMatches(token, payment.checkout_token_hash)) {
      return NextResponse.json({ ok: false, error: 'Pagamento não encontrado.' }, { status: 404 });
    }

    let current = payment;
    let pedido = null;
    if (payment.provider_payment_id && ['pendente', 'processando'].includes(payment.status)) {
      const synced = await syncMercadoPagoPayment(supabase, payment);
      current = synced.payment;
      pedido = synced.pedido;
    }
    const pedidoId = pedido?.id || current.pedido_id;
    let order = null;
    if (pedidoId) {
      const { data } = await supabase
        .from('pedidos')
        .select('id, codigo')
        .eq('id', pedidoId)
        .maybeSingle();
      order = data || null;
    }
    return NextResponse.json({
      ok: true,
      payment: {
        id: current.id,
        status: current.status,
        statusDetail: current.status_detail,
        providerOrderId: current.provider_payment_id || null,
        expiresAt: current.expires_at,
      },
      order,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao consultar pagamento.' },
      { status: 500 }
    );
  }
}
