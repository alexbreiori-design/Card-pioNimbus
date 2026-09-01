/**
 * Monta linha de endereço para geocoding.
 */
export function formatAddressForGeocode({
  logradouro,
  numero,
  bairro,
  cidade,
  estado,
  cep,
} = {}) {
  const parts = [
    [logradouro, numero].filter(Boolean).join(', '),
    bairro,
    [cidade, estado].filter(Boolean).join(' - '),
    cep ? `CEP ${cep}` : '',
    'Brasil',
  ].filter(Boolean);
  return parts.join(', ');
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
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    endereco.latitude = latitude;
    endereco.longitude = longitude;
  }
  return endereco;
}
