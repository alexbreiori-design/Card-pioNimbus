import { formatAddressForGeocode } from './formatAddress';
import { haversineKm } from './distance';

function text(value) {
  return String(value || '').trim();
}

function readPresetCoordinates(addressParts) {
  const latitude = Number(addressParts?.latitude);
  const longitude = Number(addressParts?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
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

function pickBestGeocodeHit(results, bias) {
  const hits = (Array.isArray(results) ? results : []).filter((hit) => hit?.lat && hit?.lon);
  if (!hits.length) return null;

  const biasLatitude = Number(bias?.latitude);
  const biasLongitude = Number(bias?.longitude);
  if (!Number.isFinite(biasLatitude) || !Number.isFinite(biasLongitude)) {
    return hits[0];
  }

  const origin = { latitude: biasLatitude, longitude: biasLongitude };
  return hits.reduce((best, hit) => {
    const candidate = {
      latitude: Number(hit.lat),
      longitude: Number(hit.lon),
    };
    const bestPoint = {
      latitude: Number(best.lat),
      longitude: Number(best.lon),
    };
    return haversineKm(origin, candidate) < haversineKm(origin, bestPoint) ? hit : best;
  });
}

function buildGeocodeUrl(addressParts, apiKey, bias) {
  const logradouro = text(addressParts.logradouro);
  const numero = text(addressParts.numero);
  const bairro = text(addressParts.bairro);
  const cidade = text(addressParts.cidade);
  const estado = text(addressParts.estado);
  const cep = text(addressParts.cep).replace(/\D/g, '');

  const url = new URL('https://us1.locationiq.com/v1/search');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('countrycodes', 'br');
  url.searchParams.set('accept-language', 'pt-BR');

  if (logradouro && cidade) {
    const streetParts = [numero, logradouro].filter(Boolean);
    if (bairro) streetParts.push(bairro);
    url.searchParams.set('street', streetParts.join(', '));
    url.searchParams.set('city', cidade);
    if (estado) url.searchParams.set('state', estado);
    if (cep.length === 8) url.searchParams.set('postalcode', cep);
    url.searchParams.set('country', 'Brazil');
  } else {
    const q = formatAddressForGeocode(addressParts);
    if (!q.replace(/[, Brasil]/g, '').trim()) {
      throw new Error('Endereço incompleto para geocoding.');
    }
    url.searchParams.set('q', q);
  }

  applyGeocodeBias(url, bias);
  return url;
}

/**
 * Geocoding via LocationIQ (servidor).
 * Aceita latitude/longitude já resolvidas (ex.: autocomplete) para evitar reconsulta imprecisa.
 * @returns {{ latitude: number, longitude: number }}
 */
export async function geocodeAddress(addressParts, apiKey, bias = null) {
  const preset = readPresetCoordinates(addressParts);
  if (preset) return preset;

  const url = buildGeocodeUrl(addressParts, apiKey, bias);
  const response = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error('Falha ao consultar geocoding.');
  }

  const results = await response.json();
  const hit = pickBestGeocodeHit(results, bias);
  if (!hit?.lat || !hit?.lon) {
    throw new Error('Endereço não localizado. Confira os dados ou preencha manualmente.');
  }

  return {
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
  };
}
