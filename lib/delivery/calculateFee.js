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

  let distanciaKm;
  try {
    distanciaKm = await drivingDistanceKm(origin, destination, orsKey);
  } catch {
    distanciaKm = haversineKm(origin, destination);
  }

  const zona = matchDeliveryZone(zonas, distanciaKm);
  if (!zona) {
    throw new Error('Endereço fora da área de entrega configurada.');
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
