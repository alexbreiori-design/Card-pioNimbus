import { NextResponse } from 'next/server';
import { geocodeAddress, reverseGeocodeCoordinates } from '@/lib/delivery/geocode';
import { parseCoordinate } from '@/lib/delivery/formatAddress';
import { getLocationIqKey } from '@/lib/env/server';
import { createClient } from '@/lib/supabase/server';
import { updateEmpresaCoordinates } from '@/lib/supabase/empresaServer';

/**
 * POST {
 *   slug?, persist?,
 *   reverse?,                 // true = reverse geocode a partir de lat/lng
 *   logradouro, numero, bairro, cidade, estado, cep,
 *   latitude?, longitude?,   // pin manual (com persist) ou reverse
 *   biasLatitude?, biasLongitude?
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim().toLowerCase();
    const persist = Boolean(body.persist);
    const reverse = Boolean(body.reverse);

    const manualLatitude = parseCoordinate(body.latitude);
    const manualLongitude = parseCoordinate(body.longitude);
    const hasManualPin =
      manualLatitude != null &&
      manualLongitude != null &&
      !(manualLatitude === 0 && manualLongitude === 0);

    if (reverse) {
      if (!hasManualPin) {
        return NextResponse.json(
          { error: 'Informe latitude e longitude para obter o endereço.' },
          { status: 400 }
        );
      }
      if (!process.env.LOCATIONIQ_API_KEY) {
        return NextResponse.json(
          { error: 'Serviço de geocoding não configurado. Defina LOCATIONIQ_API_KEY.' },
          { status: 503 }
        );
      }
      const resolved = await reverseGeocodeCoordinates(
        manualLatitude,
        manualLongitude,
        getLocationIqKey()
      );
      return NextResponse.json({ ok: true, ...resolved, source: 'reverse' });
    }

    if (hasManualPin && persist) {
      if (!slug) {
        return NextResponse.json(
          { error: 'Slug da loja é obrigatório para salvar a posição.' },
          { status: 400 }
        );
      }
      const coords = { latitude: manualLatitude, longitude: manualLongitude };
      const supabase = await createClient();
      await updateEmpresaCoordinates(supabase, slug, coords);
      return NextResponse.json({ ok: true, ...coords, source: 'manual' });
    }

    if (!process.env.LOCATIONIQ_API_KEY) {
      return NextResponse.json(
        { error: 'Serviço de geocoding não configurado. Defina LOCATIONIQ_API_KEY.' },
        { status: 503 }
      );
    }

    const endereco = {
      logradouro: body.logradouro,
      numero: body.numero,
      bairro: body.bairro,
      cidade: body.cidade,
      estado: body.estado,
      cep: body.cep,
    };

    const biasLatitude = parseCoordinate(body.biasLatitude);
    const biasLongitude = parseCoordinate(body.biasLongitude);
    const bias =
      biasLatitude != null && biasLongitude != null
        ? { latitude: biasLatitude, longitude: biasLongitude }
        : hasManualPin
          ? { latitude: manualLatitude, longitude: manualLongitude }
          : null;

    const coords = await geocodeAddress(endereco, getLocationIqKey(), bias);

    if (persist && slug) {
      const supabase = await createClient();
      await updateEmpresaCoordinates(supabase, slug, coords);
    }

    return NextResponse.json({ ok: true, ...coords, source: 'geocode' });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || 'Não foi possível geocodificar o endereço.' },
      { status: 400 }
    );
  }
}
