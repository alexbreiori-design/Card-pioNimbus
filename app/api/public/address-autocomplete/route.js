import { NextResponse } from 'next/server';
import { fetchAddressSuggestions } from '@/lib/delivery/addressSuggestions';
import { getLocationIqKey } from '@/lib/env/server';
import { normalizeSlug } from '@/lib/normalize';
import { getEmpresaBySlug } from '@/lib/supabase/empresaServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 40;
const requestWindows = new Map();

function consumeRateLimit(key) {
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

function clientKey(request, slug) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
  return `${slug}:${ip}`;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = normalizeSlug(searchParams.get('slug'));
    const query = String(searchParams.get('q') || '').trim().slice(0, 120);
    if (!slug || query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    if (!consumeRateLimit(clientKey(request, slug))) {
      return NextResponse.json(
        { message: 'Muitas buscas em pouco tempo. Aguarde alguns segundos.' },
        { status: 429 }
      );
    }

    const apiKey = getLocationIqKey();
    if (!apiKey) {
      return NextResponse.json(
        { message: 'Busca de endereço indisponível no momento.' },
        { status: 503 }
      );
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ message: 'Serviço indisponível.' }, { status: 503 });
    }

    const empresa = await getEmpresaBySlug(supabase, slug);
    if (!empresa) {
      return NextResponse.json({ message: 'Loja não encontrada.' }, { status: 404 });
    }
    if (empresa.suspensa === true) {
      return NextResponse.json({ message: 'Loja indisponível.' }, { status: 403 });
    }

    const suggestions = await fetchAddressSuggestions(query, { apiKey, empresa });
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[public/address-autocomplete]', error);
    return NextResponse.json(
      { message: 'Não foi possível buscar endereços agora.' },
      { status: 502 }
    );
  }
}
