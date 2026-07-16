import { NextResponse } from 'next/server';
import {
  getEmpresaForRoutes,
  releaseDeliveryRoutePedidos,
} from '@/lib/delivery/deliveryRoutesServer';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const slug = normalizeSlug(body.slug || '');
    const rotaId = body.rotaId || '';
    const pedidoId = body.pedidoId || null;

    if (!slug) {
      return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
    }
    if (!rotaId) {
      return NextResponse.json({ ok: false, error: 'Rota obrigatória.' }, { status: 400 });
    }
    if (!pedidoId) {
      return NextResponse.json(
        { ok: false, error: 'Informe o pedido a devolver ao preparo.' },
        { status: 400 }
      );
    }

    await requireStoreAdmin(slug);
    const empresa = await getEmpresaForRoutes(supabase, slug);
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const result = await releaseDeliveryRoutePedidos(supabase, empresa.id, rotaId, { pedidoId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao devolver pedidos ao preparo.' },
      { status }
    );
  }
}
