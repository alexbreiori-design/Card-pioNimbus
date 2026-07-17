import { NextResponse } from 'next/server';
import { checkPublicOrderRateLimit } from '@/lib/rateLimit';
import {
  persistPreparedPublicOrder,
  preparePublicOrder,
} from '@/lib/orders/publicOrderServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'Serviço indisponível.' },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().toLowerCase();
  const order = body.order;
  const customer = body.customer;

  if (!slug || !order || !customer) {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const rateLimit = checkPublicOrderRateLimit(request, slug);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Muitas tentativas. Aguarde um momento e tente novamente.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
      }
    );
  }

  try {
    const prepared = await preparePublicOrder({ supabase, slug, order, customer });
    const { pedido, cliente } = await persistPreparedPublicOrder({ supabase, prepared });

    return NextResponse.json({
      ok: true,
      pedidoId: pedido.id,
      codigo: pedido.codigo,
      clienteId: cliente.id,
    });
  } catch (error) {
    const message = error?.message || 'Erro ao registrar pedido.';
    const status =
      error?.status ||
      (message.includes('inválid') || message.includes('mínimo') || message.includes('fechada')
        ? 400
        : 500);
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
