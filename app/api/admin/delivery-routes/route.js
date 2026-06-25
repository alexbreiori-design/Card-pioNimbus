import { NextResponse } from 'next/server';
import {
  fetchDeliveryMapData,
  getEmpresaForRoutes,
  mapStoreOrigin,
} from '@/lib/delivery/deliveryRoutesServer';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');
  const geocode = url.searchParams.get('geocode') !== '0';

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireStoreAdmin(slug);
    const empresa = await getEmpresaForRoutes(supabase, slug);
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const mapData = await fetchDeliveryMapData(supabase, empresa.id, { geocodeMissing: geocode });
    const store = mapStoreOrigin(empresa);

    return NextResponse.json({
      ok: true,
      store,
      orders: mapData.orders,
      pendingGeocode: mapData.pendingGeocode,
      geocodedCount: mapData.geocodedCount,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar rotas.' },
      { status }
    );
  }
}
