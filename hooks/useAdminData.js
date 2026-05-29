'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ADMIN_STORAGE_KEY,
  DEFAULT_ADMIN_DATA,
  withDerivedData,
} from '@/lib/adminData';
import { fetchStoreStateBySlug, upsertStoreState } from '@/lib/supabase/storeState';

function safeLocalRead() {
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    return withDerivedData(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function useAdminData() {
  const [data, setData] = useState(() => {
    if (typeof window === 'undefined') return withDerivedData(DEFAULT_ADMIN_DATA);
    const local = safeLocalRead();
    if (local) return local;
    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(DEFAULT_ADMIN_DATA));
    return withDerivedData(DEFAULT_ADMIN_DATA);
  });
  const [ready, setReady] = useState(false);
  const dataRef = useRef(data);
  const bootRef = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;
    const currentSlug = (dataRef.current?.loja?.slug || DEFAULT_ADMIN_DATA.loja.slug || '').toLowerCase();
    fetchStoreStateBySlug(currentSlug)
      .then((remote) => {
        if (remote?.data) {
          const merged = withDerivedData(remote.data);
          window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(merged));
          dataRef.current = merged;
          setData(merged);
          return;
        }
        // Primeira vez: publica o estado default no Supabase para virar fonte única.
        return upsertStoreState(currentSlug, dataRef.current);
      })
      .catch((error) => {
        // Ainda mantém leitura local para não travar a UI, mas sinaliza problema de sincronização.
        console.error('Falha ao sincronizar estado administrativo com Supabase:', error?.message || error);
      })
      .finally(() => setReady(true));
  }, []);

  const saveData = useCallback((updater) => {
    const prev = dataRef.current;
    const next =
      typeof updater === 'function' ? withDerivedData(updater(prev)) : withDerivedData(updater);
    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(next));
    dataRef.current = next;
    setData(next);
    window.dispatchEvent(new CustomEvent('admin-data-updated'));
    upsertStoreState(next.loja?.slug, next).catch((error) => {
      console.error('Falha ao salvar estado administrativo no Supabase:', error?.message || error);
    });
    return next;
  }, []);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
        if (!raw) return;
        setData(withDerivedData(JSON.parse(raw)));
      } catch {}
    };
    window.addEventListener('admin-data-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('admin-data-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return { data, saveData, ready };
}
