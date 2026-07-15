import { NextResponse } from 'next/server';
import { concludeDeliveryRoute, getEmpresaForRoutes } from '@/lib/delivery/deliveryRoutesServer';
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
    const rotaId = String(body.rotaId || '').trim();

    if (!slug || !rotaId) {
      return NextResponse.json({ ok: false, error: 'Slug e rota obrigatórios.' }, { status: 400 });
    }

    await requireStoreAdmin(slug);
    const empresa = await getEmpresaForRoutes(supabase, slug);
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const rota = await concludeDeliveryRoute(supabase, empresa.id, rotaId);
    return NextResponse.json({ ok: true, rota });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao concluir rota.' },
      { status }
    );
  }
}
