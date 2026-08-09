/**
 * Retorna true se o ponto (lat, lng) estiver dentro do retângulo (inclusive).
 */
export function pointInExclusionBounds(lat, lng, exclusion) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const sul = Number(exclusion?.sul);
  const oeste = Number(exclusion?.oeste);
  const norte = Number(exclusion?.norte);
  const leste = Number(exclusion?.leste);
  if (
    ![latitude, longitude, sul, oeste, norte, leste].every((value) => Number.isFinite(value))
  ) {
    return false;
  }
  return latitude >= sul && latitude <= norte && longitude >= oeste && longitude <= leste;
}

/**
 * Primeira exclusão ativa que contém o ponto, ou null.
 */
export function matchDeliveryExclusion(exclusions, lat, lng) {
  const active = (exclusions || []).filter((item) => item.ativo !== false);
  return active.find((item) => pointInExclusionBounds(lat, lng, item)) || null;
}
