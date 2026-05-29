/**
 * Busca endereço por CEP via ViaCEP (uso client ou server).
 * @param {string} cepRaw
 * @returns {Promise<{ logradouro: string, bairro: string, cidade: string, estado: string, erro?: boolean } | null>}
 */
export async function fetchViaCep(cepRaw) {
  const cep = String(cepRaw || '').replace(/\D/g, '');
  if (cep.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) throw new Error('Falha ao consultar CEP.');

  const json = await response.json();
  if (json.erro) return { erro: true };

  return {
    logradouro: json.logradouro || '',
    bairro: json.bairro || '',
    cidade: json.localidade || '',
    estado: json.uf || '',
  };
}

export function formatCep(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
