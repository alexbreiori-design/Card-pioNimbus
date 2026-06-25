/** Distância aproximada entre dois pontos (Haversine), em km. */
export function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Ordena paradas a partir da loja (vizinho mais próximo).
 * @param {{ lat: number, lng: number }} origin
 * @param {Array<{ lat: number, lng: number, [key: string]: unknown }>} stops
 */
export function orderStopsNearestNeighbor(origin, stops = []) {
  const remaining = [...stops];
  const ordered = [];
  let current = origin;

  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((stop, index) => {
      const distance = haversineKm(current, stop);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    current = next;
  }

  return ordered;
}

/** Gera URL Google Maps com até 4 paradas (3 waypoints + destino no mobile). */
export function buildGoogleMapsRouteUrl(origin, orderedStops = []) {
  if (!origin?.lat || !origin?.lng || !orderedStops.length) return '';

  const stops = orderedStops.filter((stop) => stop?.lat && stop?.lng);
  if (!stops.length) return '';

  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    travelmode: 'driving',
  });

  if (stops.length === 1) {
    params.set('destination', `${stops[0].lat},${stops[0].lng}`);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1);
  params.set('destination', `${destination.lat},${destination.lng}`);
  params.set('waypoints', waypoints.map((stop) => `${stop.lat},${stop.lng}`).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function formatRouteTitle(date = new Date()) {
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `Rota ${day} ${time}`;
}

export const MAX_STOPS_PER_ROUTE = 4;
