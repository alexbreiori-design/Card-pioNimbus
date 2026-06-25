import { NextResponse } from 'next/server';
import { createDeliveryRoute, getEmpresaForRoutes } from '@/lib/delivery/deliveryRoutesServer';
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
    const pedidoDbIds = Array.isArray(body.pedidoDbIds) ? body.pedidoDbIds : [];

    if (!slug) {
      return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
    }

    await requireStoreAdmin(slug);
    const empresa = await getEmpresaForRoutes(supabase, slug);
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const result = await createDeliveryRoute(supabase, empresa, pedidoDbIds);

    return NextResponse.json({
      ok: true,
      titulo: result.titulo,
      mapsUrl: result.mapsUrl,
      rotaId: result.rota.id,
      orderedStops: result.orderedStops,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao criar rota.' },
      { status }
    );
  }
}
