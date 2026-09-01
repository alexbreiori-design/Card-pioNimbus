import { NextResponse } from 'next/server';
import { calculateDeliveryFee } from '@/lib/delivery/calculateFee';
import { getLocationIqKey, getOpenRouteServiceKey, hasDeliveryApiKeys } from '@/lib/env/server';
import {
  getEmpresaBySlug,
  listAreasExclusaoByEmpresaId,
  listZonasByEmpresaId,
} from '@/lib/supabase/empresaServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

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

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Serviço indisponível.' }, { status: 503 });
    }

    const empresa = await getEmpresaBySlug(supabase, slug);
    if (!empresa) {
      return NextResponse.json({ error: 'Loja não encontrada.' }, { status: 404 });
    }
    if (empresa.suspensa === true) {
      return NextResponse.json({ error: 'Loja indisponível no momento.' }, { status: 403 });
    }
    const enderecoResolvido = {
      ...endereco,
      cidade: String(endereco.cidade || empresa.endereco_cidade || '').trim(),
      estado: String(endereco.estado || empresa.endereco_estado || '').trim(),
    };

    const zonas = await listZonasByEmpresaId(supabase, empresa.id);
    if (!zonas.length) {
      return NextResponse.json(
        { error: 'Nenhuma zona de entrega ativa. Configure em Entrega no admin.' },
        { status: 400 }
      );
    }

    let exclusoes = [];
    try {
      exclusoes = await listAreasExclusaoByEmpresaId(supabase, empresa.id);
    } catch {
      exclusoes = [];
    }

    const result = await calculateDeliveryFee({
      empresa,
      zonas,
      exclusoes,
      endereco: enderecoResolvido,
      locationIqKey: getLocationIqKey(),
      orsKey: getOpenRouteServiceKey(),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const payload = { error: e?.message || 'Não foi possível calcular a taxa de entrega.' };
    if (e?.code === 'DELIVERY_OUT_OF_ZONE') {
      if (Number.isFinite(Number(e.distanciaKm))) payload.distanciaKm = Number(e.distanciaKm);
      if (Number.isFinite(Number(e.maxRaioKm))) payload.maxRaioKm = Number(e.maxRaioKm);
      if (Number.isFinite(Number(e.latitude))) payload.latitude = Number(e.latitude);
      if (Number.isFinite(Number(e.longitude))) payload.longitude = Number(e.longitude);
    }
    return NextResponse.json(payload, { status: 400 });
  }
}
