import { NextResponse } from 'next/server';
import { checkoutTokenMatches } from '@/lib/payments/crypto';
import { cancelPendingMercadoPagoPayment } from '@/lib/payments/paymentServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || '').trim();
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
    if (payment.status === 'aprovado') {
      return NextResponse.json(
        { ok: false, error: 'Pagamento já aprovado e não pode ser cancelado.' },
        { status: 409 }
      );
    }
    if (['cancelado', 'expirado', 'recusado', 'erro'].includes(payment.status)) {
      return NextResponse.json({
        ok: true,
        payment: {
          id: payment.id,
          status: payment.status,
          providerOrderId: payment.provider_payment_id || null,
        },
      });
    }

    const updated = await cancelPendingMercadoPagoPayment(supabase, payment);
    return NextResponse.json({
      ok: true,
      payment: {
        id: updated.id,
        status: updated.status,
        providerOrderId: updated.provider_payment_id || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Não foi possível cancelar o pagamento.' },
      { status: error?.status && error.status < 500 ? error.status : 500 }
    );
  }
}
