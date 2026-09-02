import { formatAddressForGeocode, parseCoordinate } from './formatAddress';
import { haversineKm } from './distance';

function text(value) {
  return String(value || '').trim();
}

function readPresetCoordinates(addressParts) {
  const latitude = parseCoordinate(addressParts?.latitude);
  const longitude = parseCoordinate(addressParts?.longitude);
  if (latitude == null || longitude == null) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { latitude, longitude };
}

function applyGeocodeBias(url, bias) {
  const biasLatitude = Number(bias?.latitude);
  const biasLongitude = Number(bias?.longitude);
  if (!Number.isFinite(biasLatitude) || !Number.isFinite(biasLongitude)) return;
  url.searchParams.set(
    'viewbox',
    `${biasLongitude - 0.5},${biasLatitude + 0.5},${biasLongitude + 0.5},${biasLatitude - 0.5}`
  );
  url.searchParams.set('bounded', '0');
}

function normalizeHouseNumber(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function houseNumbersMatch(expected, actual) {
  const left = normalizeHouseNumber(expected);
  const right = normalizeHouseNumber(actual);
  if (!left || !right) return false;
  if (left === right) return true;
  const leftDigits = left.replace(/\D/g, '');
  const rightDigits = right.replace(/\D/g, '');
  return Boolean(leftDigits && rightDigits && leftDigits === rightDigits);
}

function hitHouseNumber(hit) {
  return text(hit?.address?.house_number || hit?.address?.housenumber);
}

function hitScore(hit, bias, expectedNumero = '') {
  const type = String(hit?.type || '').toLowerCase();
  const cls = String(hit?.class || '').toLowerCase();
  const house = hitHouseNumber(hit);
  let score = 0;

  // Preferência forte por endereço de rua/imóvel — evitar centroide de CEP.
  if (type === 'house' || type === 'building' || cls === 'building') score += 80;
  else if (cls === 'highway' || type === 'residential' || type === 'living_street') score += 60;
  else if (type === 'yes' && cls === 'place') score += 20;
  else if (type === 'postcode' || cls === 'postalcode' || type === 'postal_code') score -= 100;

  if (expectedNumero) {
    if (houseNumbersMatch(expectedNumero, house)) {
      score += 120;
    } else if (house) {
      score += 20;
    } else if (cls === 'highway' || type === 'residential' || type === 'living_street') {
      // Eixo da avenida sem número — ruim quando o cliente/loja informou imóvel.
      score -= 50;
    }
  }

  const biasLatitude = Number(bias?.latitude);
  const biasLongitude = Number(bias?.longitude);
  if (Number.isFinite(biasLatitude) && Number.isFinite(biasLongitude)) {
    const distanceKm = haversineKm(
      { latitude: biasLatitude, longitude: biasLongitude },
      { latitude: Number(hit.lat), longitude: Number(hit.lon) }
    );
    score -= distanceKm;
  }

  return score;
}

function pickBestGeocodeHit(results, bias, expectedNumero = '') {
  const hits = (Array.isArray(results) ? results : []).filter((hit) => hit?.lat && hit?.lon);
  if (!hits.length) return null;

  return hits.reduce((best, hit) =>
    hitScore(hit, bias, expectedNumero) > hitScore(best, bias, expectedNumero) ? hit : best
  );
}

function baseSearchParams(apiKey) {
  const params = new URLSearchParams();
  params.set('key', apiKey);
  params.set('format', 'json');
  params.set('limit', '5');
  params.set('countrycodes', 'br');
  params.set('accept-language', 'pt-BR');
  params.set('addressdetails', '1');
  return params;
}

function pushStructuredAttempt(attempts, { apiKey, street, cidade, estado, cep, bias }) {
  const structured = new URL('https://us1.locationiq.com/v1/search/structured');
  structured.search = baseSearchParams(apiKey).toString();
  structured.searchParams.set('street', street);
  structured.searchParams.set('city', cidade);
  if (estado) structured.searchParams.set('state', estado);
  if (cep) structured.searchParams.set('postalcode', cep);
  structured.searchParams.set('country', 'Brazil');
  applyGeocodeBias(structured, bias);
  attempts.push(structured);
}

function pushFreeFormAttempt(attempts, { apiKey, q, bias }) {
  if (!q.replace(/[, Brasil]/g, '').trim()) return;
  const freeForm = new URL('https://us1.locationiq.com/v1/search');
  freeForm.search = baseSearchParams(apiKey).toString();
  freeForm.searchParams.set('q', q);
  applyGeocodeBias(freeForm, bias);
  attempts.push(freeForm);
}

/**
 * Monta tentativas de geocode em ordem de precisão.
 * CEP sozinho / cedo demais devolve centroide. Com rua+número, CEP entra só como desempate
 * (avenidas longas com vários CEPs).
 */
function buildGeocodeAttempts(addressParts, apiKey, bias) {
  const logradouro = text(addressParts.logradouro);
  const numero = text(addressParts.numero);
  const bairro = text(addressParts.bairro);
  const cidade = text(addressParts.cidade);
  const estado = text(addressParts.estado);
  const cep = text(addressParts.cep).replace(/\D/g, '');
  const attempts = [];

  if (logradouro && cidade) {
    const street = [numero, logradouro].filter(Boolean).join(' ');

    pushStructuredAttempt(attempts, {
      apiKey,
      street,
      cidade,
      estado,
      bias,
    });

    pushFreeFormAttempt(attempts, {
      apiKey,
      q: formatAddressForGeocode({
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
      }),
      bias,
    });

    // Desempate multi-CEP: postalcode só depois de rua+número.
    if (cep.length === 8) {
      pushStructuredAttempt(attempts, {
        apiKey,
        street,
        cidade,
        estado,
        cep,
        bias,
      });
      pushFreeFormAttempt(attempts, {
        apiKey,
        q: [
          [logradouro, numero].filter(Boolean).join(', '),
          bairro,
          [cidade, estado].filter(Boolean).join(' - '),
          cep,
          'Brasil',
        ]
          .filter(Boolean)
          .join(', '),
        bias,
      });
    }
  } else {
    pushFreeFormAttempt(attempts, {
      apiKey,
      q: formatAddressForGeocode({
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
        cep: logradouro ? '' : cep,
      }),
      bias,
    });
  }

  return attempts;
}

function isWeakAvenueHit(hit, expectedNumero) {
  if (!expectedNumero) return false;
  if (houseNumbersMatch(expectedNumero, hitHouseNumber(hit))) return false;
  const type = String(hit?.type || '').toLowerCase();
  const cls = String(hit?.class || '').toLowerCase();
  return (
    type === 'postcode' ||
    cls === 'postalcode' ||
    type === 'postal_code' ||
    ((cls === 'highway' || type === 'residential' || type === 'living_street') &&
      !hitHouseNumber(hit))
  );
}

async function fetchGeocodeHit(url, bias, expectedNumero) {
  const response = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!response.ok) return null;
  const results = await response.json();
  return pickBestGeocodeHit(results, bias, expectedNumero);
}

/**
 * Geocoding via LocationIQ (servidor).
 * Aceita latitude/longitude já resolvidas (ex.: autocomplete de rua sem número).
 * Com número do imóvel, o pin da rua é só bias — recalcula o ponto completo.
 * @returns {{ latitude: number, longitude: number }}
 */
export async function geocodeAddress(addressParts, apiKey, bias = null) {
  const preset = readPresetCoordinates(addressParts);
  const hasNumero = Boolean(text(addressParts?.numero));
  if (preset && !hasNumero) return preset;

  const expectedNumero = text(addressParts?.numero);
  const effectiveBias = bias || preset;
  const attempts = buildGeocodeAttempts(addressParts, apiKey, effectiveBias);
  let lastNetworkError = false;
  let weakFallback = null;

  for (let index = 0; index < attempts.length; index += 1) {
    const url = attempts[index];
    try {
      const hit = await fetchGeocodeHit(url, effectiveBias, expectedNumero);
      if (!hit) continue;

      if (isWeakAvenueHit(hit, expectedNumero) && index < attempts.length - 1) {
        if (!weakFallback) weakFallback = hit;
        continue;
      }

      return {
        latitude: Number(hit.lat),
        longitude: Number(hit.lon),
      };
    } catch {
      lastNetworkError = true;
    }
  }

  if (weakFallback) {
    return {
      latitude: Number(weakFallback.lat),
      longitude: Number(weakFallback.lon),
    };
  }

  if (lastNetworkError) {
    throw new Error('Falha ao consultar geocoding.');
  }
  throw new Error('Endereço não localizado. Confira os dados ou preencha manualmente.');
}
