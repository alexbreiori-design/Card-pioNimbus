import { formatAddressForGeocode } from './formatAddress';

/**
 * Geocoding via LocationIQ (servidor).
 * @returns {{ latitude: number, longitude: number }}
 */
export async function geocodeAddress(addressParts, apiKey) {
  const q = formatAddressForGeocode(addressParts);
  if (!q.replace(/[, Brasil]/g, '').trim()) {
    throw new Error('Endereço incompleto para geocoding.');
  }

  const url = new URL('https://us1.locationiq.com/v1/search');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('q', q);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'br');

  const response = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!response.ok) {
    throw new Error('Falha ao consultar geocoding.');
  }

  const results = await response.json();
  const hit = Array.isArray(results) ? results[0] : null;
  if (!hit?.lat || !hit?.lon) {
    throw new Error('Endereço não localizado. Confira os dados ou preencha manualmente.');
  }

  return {
    latitude: Number(hit.lat),
    longitude: Number(hit.lon),
  };
}
