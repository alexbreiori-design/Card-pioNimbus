'use client';

import { useEffect, useRef, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';

function feeToDraftString(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Calcula taxa de entrega automática no pedido manual (Fase 8).
 */
export function useOrderDeliveryFee(draft, setDraft) {
  const { data } = useAdminData();
  const slug = (data?.loja?.slug || '').toLowerCase();
  const timerRef = useRef(null);
  const controllerRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (controllerRef.current) controllerRef.current.abort();

    const clearCalculatedDelivery = (current) => {
      if (
        current.taxaEntrega === '0' &&
        current.distanciaKm === null &&
        current.enderecoLatitude === null &&
        current.enderecoLongitude === null
      ) {
        return current;
      }
      return {
        ...current,
        taxaEntrega: '0',
        distanciaKm: null,
        enderecoLatitude: null,
        enderecoLongitude: null,
      };
    };

    if (draft.tipo !== 'delivery') {
      return;
    }

    const logradouro = String(draft.logradouro || '').trim();
    const numero = String(draft.numero || '').trim();
    const bairro = String(draft.bairro || '').trim();
    const cidade = String(draft.cidade || '').trim();
    if (!slug || !logradouro || !numero) {
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const controller = new AbortController();
      controllerRef.current = controller;
      try {
        const res = await fetch('/api/delivery-fee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            slug,
            endereco: {
              logradouro,
              numero,
              bairro,
              cidade,
              estado: String(draft.estado || '').trim(),
              cep: String(draft.cep || '').replace(/\D/g, ''),
            },
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setDraft(clearCalculatedDelivery);
          return;
        }
        setDraft((d) => ({
          ...d,
          taxaEntrega: feeToDraftString(json.taxaEntrega),
          distanciaKm: numberOrNull(json.distanciaKm),
          enderecoLatitude: numberOrNull(json.latitude),
          enderecoLongitude: numberOrNull(json.longitude),
        }));
      } catch (error) {
        if (error.name !== 'AbortError') setDraft(clearCalculatedDelivery);
      } finally {
        setLoading(false);
      }
    }, 650);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (controllerRef.current) controllerRef.current.abort();
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
