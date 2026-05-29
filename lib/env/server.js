/**
 * Variáveis de ambiente apenas para Route Handlers / servidor.
 * Nunca importar em componentes client.
 */

export function getLocationIqKey() {
  const key = process.env.LOCATIONIQ_API_KEY;
  if (!key) throw new Error('LOCATIONIQ_API_KEY não configurada.');
  return key;
}

export function getOpenRouteServiceKey() {
  const key = process.env.OPENROUTESERVICE_API_KEY;
  if (!key) throw new Error('OPENROUTESERVICE_API_KEY não configurada.');
  return key;
}

export function hasDeliveryApiKeys() {
  return Boolean(process.env.LOCATIONIQ_API_KEY && process.env.OPENROUTESERVICE_API_KEY);
}

export function hasGeocodeApiKey() {
  return Boolean(process.env.LOCATIONIQ_API_KEY);
}
