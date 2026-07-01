'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { getEmpresaBySlug } from '@/lib/supabase/empresa';
import { withTimeout } from '@/lib/fetchWithTimeout';

const EMPRESA_FETCH_TIMEOUT_MS = 15000;

/**
 * Carrega a empresa (tenant) atual com base no slug da loja no admin.
 */
export function useEmpresa() {
  const { data, ready } = useAdminData();
  const [empresaId, setEmpresaId] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const slug = (data?.loja?.slug || '').toLowerCase();

  const refresh = useCallback(async () => {
    if (!slug) {
      setEmpresaId(null);
      setEmpresa(null);
      setLoading(false);
      setError('Slug da loja não configurado em Minha loja.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const row = await withTimeout(
        getEmpresaBySlug(slug),
        EMPRESA_FETCH_TIMEOUT_MS,
        'Tempo esgotado ao carregar empresa.'
      );
      if (!row) {
        setEmpresaId(null);
        setEmpresa(null);
        setError(
          `Nenhuma empresa encontrada com o slug "${slug}". Confira o seed no Supabase (tabela empresas).`
        );
        return;
      }
      setEmpresaId(row.id);
      setEmpresa(row);
    } catch (e) {
      setEmpresaId(null);
      setEmpresa(null);
      setError(e?.message || 'Erro ao carregar empresa.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!ready) return;
    refresh();
  }, [ready, refresh]);

  return { empresaId, empresa, slug, loading, error, refresh };
}
