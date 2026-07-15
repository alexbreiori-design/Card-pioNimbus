import { NextResponse } from 'next/server';
import {
  fetchDeliveryMapData,
  getEmpresaForRoutes,
  listActiveDeliveryRoutes,
  listActiveEntregadores,
  listDeliveryRoutes,
  mapStoreOrigin,
} from '@/lib/delivery/deliveryRoutesServer';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');
  const geocode = url.searchParams.get('geocode') !== '0';
  const history = url.searchParams.get('history') === '1';
  const entregadorId = String(url.searchParams.get('entregadorId') || '').trim();

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

    if (history) {
      const [{ data: allDrivers }, historico] = await Promise.all([
        supabase
          .from('entregadores')
          .select('id, nome, telefone, ativo')
          .eq('empresa_id', empresa.id)
          .order('nome', { ascending: true }),
        listDeliveryRoutes(supabase, empresa.id, {
          status: 'all',
          limit: 80,
          entregadorId,
        }),
      ]);

      return NextResponse.json({
        ok: true,
        entregadores: allDrivers || [],
        historico,
      });
    }

    const [mapData, entregadores, rotasAtivas] = await Promise.all([
      fetchDeliveryMapData(supabase, empresa.id, { geocodeMissing: geocode }),
      listActiveEntregadores(supabase, empresa.id),
      listActiveDeliveryRoutes(supabase, empresa.id),
    ]);
    const store = mapStoreOrigin(empresa);

    return NextResponse.json({
      ok: true,
      store,
      orders: mapData.orders,
      pendingGeocode: mapData.pendingGeocode,
      geocodedCount: mapData.geocodedCount,
      entregadores,
      rotasAtivas,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar rotas.' },
      { status }
    );
  }
}
