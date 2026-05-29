import { NextResponse } from 'next/server';
import { calculateDeliveryFee } from '@/lib/delivery/calculateFee';
import { getLocationIqKey, getOpenRouteServiceKey, hasDeliveryApiKeys } from '@/lib/env/server';
import { createClient } from '@/lib/supabase/server';
import { getEmpresaBySlug, listZonasByEmpresaId } from '@/lib/supabase/empresaServer';

/**
 * POST { slug, endereco: { logradouro, numero, bairro, cidade, estado, cep } }
 */
export async function POST(request) {
  if (!hasDeliveryApiKeys()) {
    return NextResponse.json(
      {
        error:
          'Serviço de entrega não configurado. Defina LOCATIONIQ_API_KEY e OPENROUTESERVICE_API_KEY.',
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim().toLowerCase();
    const endereco = body.endereco || body;
    if (!slug) {
      return NextResponse.json({ error: 'Slug da loja é obrigatório.' }, { status: 400 });
    }

    const supabase = await createClient();
    const empresa = await getEmpresaBySlug(supabase, slug);
    if (!empresa) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }

    const zonas = await listZonasByEmpresaId(supabase, empresa.id);
    if (!zonas.length) {
      return NextResponse.json(
        { error: 'Nenhuma zona de entrega ativa. Configure em Entrega no admin.' },
        { status: 400 }
      );
    }

    const result = await calculateDeliveryFee({
      empresa,
      zonas,
      endereco,
      locationIqKey: getLocationIqKey(),
      orsKey: getOpenRouteServiceKey(),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Não foi possível calcular a taxa de entrega.' },
      { status: 400 }
    );
  }
}
