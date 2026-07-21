import { NextResponse } from 'next/server';
import { getLocationIqKey } from '@/lib/env/server';
import { normalizeSlug } from '@/lib/normalize';
import { getEmpresaBySlug } from '@/lib/supabase/empresaServer';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const requestWindows = new Map();
const STATE_CODES = {
  acre: 'AC',
  alagoas: 'AL',
  amapá: 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceará: 'CE',
  'distrito federal': 'DF',
  'espírito santo': 'ES',
  goiás: 'GO',
  maranhão: 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  pará: 'PA',
  paraíba: 'PB',
  paraná: 'PR',
  pernambuco: 'PE',
  piauí: 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondônia: 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'são paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
};

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

function text(value) {
  return String(value || '').trim();
}

function first(address, keys) {
  for (const key of keys) {
    if (text(address?.[key])) return text(address[key]);
  }
  return '';
}

function mapSuggestion(item) {
  const address = item?.address || {};
  const logradouro = first(address, [
    'road',
    'pedestrian',
    'residential',
    'path',
    'name',
  ]);
  if (!logradouro) return null;

  const numero = first(address, ['house_number']);
  const bairro = first(address, [
    'suburb',
    'neighbourhood',
    'quarter',
    'city_district',
    'village',
  ]);
  const cidade = first(address, ['city', 'town', 'municipality', 'village']);
  const stateCode = first(address, ['state_code']).replace(/^BR-/i, '').toUpperCase();
  const stateName = first(address, ['state']);
  const estado =
    (stateCode.length === 2 ? stateCode : '') ||
    STATE_CODES[stateName.toLocaleLowerCase('pt-BR')] ||
    stateName;
  const cep = first(address, ['postcode']).replace(/\D/g, '').slice(0, 8);
  const details = [bairro, cidade, estado, cep].filter(Boolean);

  return {
    id: text(item.place_id) || `${item.lat}:${item.lon}:${logradouro}`,
    label: [logradouro, numero].filter(Boolean).join(', '),
    details: details.join(' · '),
    logradouro,
    numero,
    bairro,
    cidade,
    estado,
    cep,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = normalizeSlug(searchParams.get('slug'));
    const query = text(searchParams.get('q')).slice(0, 120);
    if (!slug || query.length < 3) {
      return NextResponse.json({ suggestions: [] });
    }

    const user = await requireStoreAdmin(slug);
    if (!consumeRateLimit(`${user.id}:${slug}`)) {
      return NextResponse.json(
        { message: 'Muitas buscas em pouco tempo. Aguarde alguns segundos.' },
        { status: 429 }
      );
    }

    const apiKey = getLocationIqKey();
    if (!apiKey) {
      return NextResponse.json(
        { message: 'Autocomplete de endereço não configurado.' },
        { status: 503 }
      );
    }

    const empresa = await getEmpresaBySlug(getServiceClient(), slug);
    const url = new URL('https://api.locationiq.com/v1/autocomplete');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '8');
    url.searchParams.set('countrycodes', 'br');
    url.searchParams.set('accept-language', 'pt-BR');
    url.searchParams.set('normalizecity', '1');
    url.searchParams.set('dedupe', '1');

    const latitude = Number(empresa?.latitude);
    const longitude = Number(empresa?.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      url.searchParams.set(
        'viewbox',
        `${longitude - 0.5},${latitude + 0.5},${longitude + 0.5},${latitude - 0.5}`
      );
      url.searchParams.set('bounded', '0');
    }

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      console.error('[address-autocomplete] LocationIQ failed:', response.status);
      return NextResponse.json(
        { message: 'Não foi possível buscar endereços agora.' },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const seen = new Set();
    const suggestions = (Array.isArray(payload) ? payload : [])
      .map(mapSuggestion)
      .filter(Boolean)
      .filter((item) => {
        const key = [
          item.logradouro,
          item.bairro,
          item.cidade,
          item.estado,
          item.cep,
        ]
          .join('|')
          .toLocaleLowerCase('pt-BR');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);

    return NextResponse.json({ suggestions });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error('[address-autocomplete]', error);
    return NextResponse.json(
      { message: status === 401 || status === 403 ? error.message : 'Erro ao buscar endereços.' },
      { status }
    );
  }
}
