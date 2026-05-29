/**
 * Escolhe a zona ativa de menor raio que ainda cobre a distância.
 */
export function matchDeliveryZone(zones, distanceKm) {
  const distance = Number(distanceKm);
  if (!Number.isFinite(distance) || distance < 0) return null;

  const active = (zones || [])
    .filter((z) => z.ativo !== false)
    .map((z) => ({
      ...z,
      raio_km: Number(z.raio_km),
      taxa_entrega: Number(z.taxa_entrega),
    }))
    .filter((z) => Number.isFinite(z.raio_km) && z.raio_km > 0)
    .sort((a, b) => a.raio_km - b.raio_km);

  return active.find((z) => distance <= z.raio_km) || null;
}
