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
