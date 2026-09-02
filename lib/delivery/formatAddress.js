/**
 * Monta linha de endereço para geocoding (free-form).
 * Não incluir "CEP …" quando há logradouro: o LocationIQ/Nominatim prioriza o
 * centroide do CEP e ignora rua/número — isso marca entrega como fora da zona.
 */
export function formatAddressForGeocode({
  logradouro,
  numero,
  bairro,
  cidade,
  estado,
  cep,
} = {}) {
  const hasStreet = Boolean(String(logradouro || '').trim());
  const parts = [
    [logradouro, numero].filter(Boolean).join(', '),
    bairro,
    [cidade, estado].filter(Boolean).join(' - '),
    !hasStreet && cep ? String(cep).replace(/\D/g, '') : '',
    'Brasil',
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Converte lat/lng vindos do formulário. `Number(null) === 0` (Null Island) —
 * trata null/vazio como ausente para forçar geocode real no fluxo de CEP.
 */
export function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

/**
 * Normaliza endereço do cardápio/admin para cálculo de entrega.
 */
export function normalizeDeliveryEnderecoInput(input = {}) {
  const endereco = {
    logradouro: String(input.logradouro || input.rua || '').trim(),
    numero: String(input.numero || input.num || '').trim(),
    bairro: String(input.bairro || '').trim(),
    cidade: String(input.cidade || '').trim(),
    estado: String(input.estado || '').trim(),
    cep: String(input.cep || '').replace(/\D/g, ''),
  };
  const latitude = parseCoordinate(input.latitude);
  const longitude = parseCoordinate(input.longitude);
  // 0,0 = Null Island — nunca é endereço BR válido vindo do autocomplete.
  if (
    latitude != null &&
    longitude != null &&
    !(latitude === 0 && longitude === 0)
  ) {
    endereco.latitude = latitude;
    endereco.longitude = longitude;
  }
  return endereco;
}
