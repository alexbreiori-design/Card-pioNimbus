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

function hitScore(hit, bias) {
  const type = String(hit?.type || '').toLowerCase();
  const cls = String(hit?.class || '').toLowerCase();
  let score = 0;

  // Preferência forte por endereço de rua/imóvel — evitar centroide de CEP.
  if (type === 'house' || type === 'building' || cls === 'building') score += 80;
  else if (cls === 'highway' || type === 'residential' || type === 'living_street') score += 60;
  else if (type === 'yes' && cls === 'place') score += 20;
  else if (type === 'postcode' || cls === 'postalcode' || type === 'postal_code') score -= 100;

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

function pickBestGeocodeHit(results, bias) {
  const hits = (Array.isArray(results) ? results : []).filter((hit) => hit?.lat && hit?.lon);
  if (!hits.length) return null;

  return hits.reduce((best, hit) => (hitScore(hit, bias) > hitScore(best, bias) ? hit : best));
}

function baseSearchParams(apiKey) {
  const params = new URLSearchParams();
  params.set('key', apiKey);
  params.set('format', 'json');
  params.set('limit', '5');
  params.set('countrycodes', 'br');
  params.set('accept-language', 'pt-BR');
  return params;
}

/**
 * Monta tentativas de geocode em ordem de precisão.
 * CEP em free-form / postalcode sozinho costuma devolver o centroide do CEP
 * (fora da zona). Rua+número sem CEP é o caminho confiável no Brasil.
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
    const structured = new URL('https://us1.locationiq.com/v1/search/structured');
    structured.search = baseSearchParams(apiKey).toString();
    structured.searchParams.set('street', street);
    structured.searchParams.set('city', cidade);
    if (estado) structured.searchParams.set('state', estado);
    structured.searchParams.set('country', 'Brazil');
    applyGeocodeBias(structured, bias);
    attempts.push(structured);

    // Free-form sem CEP (bairro só como contexto textual).
    const freeForm = new URL('https://us1.locationiq.com/v1/search');
    freeForm.search = baseSearchParams(apiKey).toString();
    freeForm.searchParams.set(
      'q',
      formatAddressForGeocode({
        logradouro,
        numero,
        bairro,
        cidade,
        estado,
      })
    );
    applyGeocodeBias(freeForm, bias);
    attempts.push(freeForm);
  } else {
    const q = formatAddressForGeocode({
      logradouro,
      numero,
      bairro,
      cidade,
      estado,
      // CEP só como último recurso quando não há rua.
      cep: logradouro ? '' : cep,
    });
    if (!q.replace(/[, Brasil]/g, '').trim()) {
      throw new Error('Endereço incompleto para geocoding.');
    }
    const freeForm = new URL('https://us1.locationiq.com/v1/search');
    freeForm.search = baseSearchParams(apiKey).toString();
    freeForm.searchParams.set('q', q);
    applyGeocodeBias(freeForm, bias);
    attempts.push(freeForm);
  }

  return attempts;
}

async function fetchGeocodeHit(url, bias) {
  const response = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!response.ok) return null;
  const results = await response.json();
  return pickBestGeocodeHit(results, bias);
}

/**
 * Geocoding via LocationIQ (servidor).
 * Aceita latitude/longitude já resolvidas (ex.: autocomplete) para evitar reconsulta imprecisa.
 * @returns {{ latitude: number, longitude: number }}
 */
export async function geocodeAddress(addressParts, apiKey, bias = null) {
  const preset = readPresetCoordinates(addressParts);
  if (preset) return preset;

  const attempts = buildGeocodeAttempts(addressParts, apiKey, bias);
  let lastNetworkError = false;

  for (let index = 0; index < attempts.length; index += 1) {
    const url = attempts[index];
    try {
      const hit = await fetchGeocodeHit(url, bias);
      if (!hit) continue;
      const type = String(hit.type || '').toLowerCase();
      const cls = String(hit.class || '').toLowerCase();
      // Centroide de CEP: tenta a próxima estratégia antes de aceitar.
      if (
        (type === 'postcode' || cls === 'postalcode' || type === 'postal_code') &&
        index < attempts.length - 1
      ) {
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

  if (lastNetworkError) {
    throw new Error('Falha ao consultar geocoding.');
  }
  throw new Error('Endereço não localizado. Confira os dados ou preencha manualmente.');
}
