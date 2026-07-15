import { NextResponse } from 'next/server';
import {
  loadPublicDeliveryRoute,
  markPublicRouteDelivered,
} from '@/lib/delivery/publicRouteActions';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(_request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    const { token } = await params;
    const route = await loadPublicDeliveryRoute(supabase, token);
    return NextResponse.json({ ok: true, route });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar rota.' },
      { status }
    );
  }
}

export async function POST(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    const { token } = await params;
    const body = await request.json().catch(() => ({}));
    const route = await markPublicRouteDelivered(supabase, token, {
      pedidoId: body.pedidoId || null,
      all: body.all === true,
    });
    return NextResponse.json({ ok: true, route });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao marcar entrega.' },
      { status }
    );
  }
}
