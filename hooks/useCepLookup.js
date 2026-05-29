'use client';

import { useCallback, useState } from 'react';
import { fetchViaCep } from '@/lib/cep/viacep';

/**
 * Hook reutilizável para busca de endereço por CEP (ViaCEP).
 */
export function useCepLookup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const lookup = useCallback(async (cepRaw) => {
    const cep = String(cepRaw || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      setError('Informe um CEP válido (8 dígitos).');
      return null;
    }

    setLoading(true);
    setError('');
    try {
      const result = await fetchViaCep(cep);
      if (!result || result.erro) {
        setError('CEP não encontrado. Preencha o endereço manualmente.');
        return null;
      }
      return result;
    } catch {
      setError('Não foi possível consultar o CEP. Tente novamente.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(''), []);

  return { lookup, loading, error, clearError };
}
