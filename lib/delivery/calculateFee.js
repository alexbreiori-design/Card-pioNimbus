import { geocodeAddress } from './geocode';
import { drivingDistanceKm, haversineKm } from './distance';
import { matchDeliveryExclusion } from './matchExclusion';
import { matchDeliveryZone } from './matchZone';

/**
 * Calcula taxa de entrega para um endereço de cliente.
 * Match de zona usa km de rota (ORS); se ORS falhar, cai em linha reta.
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

  const distanciaLinhaRetaKm = haversineKm(origin, destination);
  let distanciaKm = distanciaLinhaRetaKm;
  let distanciaModo = 'linha_reta';
  try {
    distanciaKm = await drivingDistanceKm(origin, destination, orsKey);
    distanciaModo = 'rota';
  } catch {
    /* ORS indisponível: anéis usam linha reta */
  }

  // Anéis: menor raio_km que ainda cobre a distância (rota, ou fallback).
  const zona = matchDeliveryZone(zonas, distanciaKm);
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
    error.distanciaKm = distanciaKm;
    error.distanciaModo = distanciaModo;
    error.maxRaioKm = maxRaioKm;
    error.latitude = destination.latitude;
    error.longitude = destination.longitude;
    throw error;
  }

  return {
    taxaEntrega: Number(zona.taxa_entrega),
    distanciaKm,
    distanciaModo,
    zonaNome: zona.nome,
    zonaId: zona.id,
    latitude: destination.latitude,
    longitude: destination.longitude,
  };
}
