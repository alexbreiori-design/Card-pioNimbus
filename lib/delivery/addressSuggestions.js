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

function text(value) {
  return String(value || '').trim();
}

function first(address, keys) {
  for (const key of keys) {
    if (text(address?.[key])) return text(address[key]);
  }
  return '';
}

export function mapAddressSuggestion(item) {
  const address = item?.address || {};
  const logradouro = first(address, ['road', 'pedestrian', 'residential', 'path', 'name']);
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

export function dedupeAddressSuggestions(items, limit = 6) {
  const seen = new Set();
  return (items || [])
    .map(mapAddressSuggestion)
    .filter(Boolean)
    .filter((item) => {
      const key = [item.logradouro, item.bairro, item.cidade, item.estado, item.cep]
        .join('|')
        .toLocaleLowerCase('pt-BR');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/**
 * Busca sugestões de endereço via LocationIQ (servidor).
 */
export async function fetchAddressSuggestions(query, { apiKey, empresa } = {}) {
  const q = text(query).slice(0, 120);
  if (!apiKey || q.length < 3) return [];

  const url = new URL('https://api.locationiq.com/v1/autocomplete');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', q);
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
    throw new Error('Não foi possível buscar endereços agora.');
  }

  const payload = await response.json();
  return dedupeAddressSuggestions(Array.isArray(payload) ? payload : []);
}
