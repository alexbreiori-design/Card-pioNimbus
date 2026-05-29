import { NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/delivery/geocode';
import { getLocationIqKey } from '@/lib/env/server';
import { createClient } from '@/lib/supabase/server';
import { updateEmpresaCoordinates } from '@/lib/supabase/empresaServer';

/**
 * POST { slug?, logradouro, numero, bairro, cidade, estado, cep, persist? }
 */
export async function POST(request) {
  if (!process.env.LOCATIONIQ_API_KEY) {
    return NextResponse.json(
      { error: 'Serviço de geocoding não configurado. Defina LOCATIONIQ_API_KEY.' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const endereco = {
      logradouro: body.logradouro,
      numero: body.numero,
      bairro: body.bairro,
      cidade: body.cidade,
      estado: body.estado,
      cep: body.cep,
    };

    const coords = await geocodeAddress(endereco, getLocationIqKey());

    if (body.persist && body.slug) {
      const supabase = await createClient();
      await updateEmpresaCoordinates(supabase, body.slug, coords);
    }

    return NextResponse.json({ ok: true, ...coords });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Não foi possível geocodificar o endereço.' },
      { status: 400 }
    );
  }
}
