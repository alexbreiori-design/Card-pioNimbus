import { geocodeAddress } from './geocode';
import { drivingDistanceKm, haversineKm } from './distance';
import { matchDeliveryExclusion } from './matchExclusion';
import { matchDeliveryZone } from './matchZone';

/**
 * Calcula taxa de entrega para um endereço de cliente.
 */
export async function calculateDeliveryFee({
  empresa,
  zonas,
  exclusoes = [],
  endereco,
  locationIqKey,
  orsKey,
}) {
  if (!empresa?.latitude || !empresa?.longitude) {
    throw new Error(
      'A loja ainda não tem coordenadas. Salve o endereço em Minha loja ou use Recalcular coordenadas em Entrega.'
    );
  }

  const origin = {
    latitude: Number(empresa.latitude),
    longitude: Number(empresa.longitude),
  };
  const destination = await geocodeAddress(endereco, locationIqKey, origin);

  const blocked = matchDeliveryExclusion(exclusoes, destination.latitude, destination.longitude);
  if (blocked) {
    throw new Error('Não entregamos neste endereço.');
  }

  const distanciaZonaKm = haversineKm(origin, destination);
  let distanciaKm = distanciaZonaKm;
  try {
    distanciaKm = await drivingDistanceKm(origin, destination, orsKey);
  } catch {
    /* fallback já é linha reta */
  }

  // Zonas no admin são círculos por raio geográfico — comparar com linha reta.
  const zona = matchDeliveryZone(zonas, distanciaZonaKm);
  if (!zona) {
    const maxRaioKm = Math.max(
      0,
      ...(zonas || [])
        .filter((z) => z.ativo !== false)
        .map((z) => Number(z.raio_km))
        .filter((value) => Number.isFinite(value) && value > 0)
    );
    const error = new Error('Endereço fora da área de entrega configurada.');
    error.code = 'DELIVERY_OUT_OF_ZONE';
    error.distanciaKm = distanciaZonaKm;
    error.maxRaioKm = maxRaioKm;
    error.latitude = destination.latitude;
    error.longitude = destination.longitude;
    throw error;
  }

  return {
    taxaEntrega: Number(zona.taxa_entrega),
    distanciaKm,
    zonaNome: zona.nome,
    zonaId: zona.id,
    latitude: destination.latitude,
    longitude: destination.longitude,
  };
}
