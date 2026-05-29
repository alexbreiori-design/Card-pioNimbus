'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';

function feeToDraftString(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}

/**
 * Calcula taxa de entrega automática no pedido manual (Fase 8).
 */
export function useOrderDeliveryFee(draft, setDraft) {
  const { data } = useAdminData();
  const slug = (data?.loja?.slug || '').toLowerCase();
  const timerRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (draft.tipo !== 'delivery') {
      setLoading(false);
      setDraft((d) => (d.taxaEntrega === '0' ? d : { ...d, taxaEntrega: '0' }));
      return;
    }

    const logradouro = String(draft.logradouro || '').trim();
    const bairro = String(draft.bairro || '').trim();
    const cidade = String(draft.cidade || '').trim();
    if (!slug || !logradouro || !bairro || !cidade) {
      setLoading(false);
      setDraft((d) => (d.taxaEntrega === '0' ? d : { ...d, taxaEntrega: '0' }));
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/delivery-fee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            endereco: {
              logradouro,
              numero: String(draft.numero || '').trim(),
              bairro,
              cidade,
              estado: String(draft.estado || '').trim(),
              cep: String(draft.cep || '').replace(/\D/g, ''),
            },
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setDraft((d) => ({ ...d, taxaEntrega: '0' }));
          return;
        }
        setDraft((d) => ({
          ...d,
          taxaEntrega: feeToDraftString(json.taxaEntrega),
        }));
      } catch {
        setDraft((d) => ({ ...d, taxaEntrega: '0' }));
      } finally {
        setLoading(false);
      }
    }, 650);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    draft.tipo,
    draft.cep,
    draft.logradouro,
    draft.numero,
    draft.bairro,
    draft.cidade,
    draft.estado,
    slug,
    setDraft,
  ]);

  return loading;
}
