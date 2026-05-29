/**
 * Distância em km entre dois pontos (OpenRouteService — driving).
 */
export async function drivingDistanceKm(
  origin,
  destination,
  apiKey
) {
  const body = {
    coordinates: [
      [origin.longitude, origin.latitude],
      [destination.longitude, destination.latitude],
    ],
  };

  const response = await fetch('https://api.openrouteservice.org/v2/directions/driving-car', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Não foi possível calcular a rota de entrega.');
  }

  const json = await response.json();
  const meters = json?.routes?.[0]?.summary?.distance;
  if (typeof meters !== 'number') {
    throw new Error('Resposta de rota inválida.');
  }

  return Math.round((meters / 1000) * 100) / 100;
}

/**
 * Distância em linha reta (fallback quando ORS indisponível).
 */
export function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)) * 100) / 100;
}
