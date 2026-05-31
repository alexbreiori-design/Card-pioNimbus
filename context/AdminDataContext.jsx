'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEFAULT_ADMIN_DATA, withDerivedData } from '@/lib/adminData';
import { mergeStoreStates, stampStoreMeta } from '@/lib/storeStateMerge';
import {
  createEmptyStoreSeed,
  readLegacyLocalStorageState,
  resolveBootSlug,
} from '@/lib/storeBoot';
import { fetchStoreStateBySlug, upsertStoreState } from '@/lib/supabase/storeState';

const AdminDataContext = createContext(null);

function resolveSlug(data) {
  return String(data?.loja?.slug || DEFAULT_ADMIN_DATA.loja.slug || '')
    .trim()
    .toLowerCase();
}

export function AdminDataProvider({ children }) {
  const [data, setData] = useState(() => withDerivedData(DEFAULT_ADMIN_DATA));
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const dataRef = useRef(data);
  const bootRef = useRef(false);
  const saveQueueRef = useRef(Promise.resolve());

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const applyState = useCallback((next) => {
    const derived = withDerivedData(next);
    dataRef.current = derived;
    setData(derived);
    return derived;
  }, []);

  const refreshFromRemote = useCallback(async (slugOverride) => {
    const slug = slugOverride || resolveSlug(dataRef.current);
    if (!slug) return dataRef.current;
    const remote = await fetchStoreStateBySlug(slug);
    const merged = mergeStoreStates({
      local: dataRef.current,
      remote: remote?.data ? withDerivedData(remote.data) : null,
      remoteUpdatedAt: remote?.updated_at,
    });
    return applyState(merged);
  }, [applyState]);

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    (async () => {
      try {
        const slug = await resolveBootSlug();
        const legacyLocal = readLegacyLocalStorageState();
        const remote = await fetchStoreStateBySlug(slug);

        if (remote?.data) {
          applyState(
            mergeStoreStates({
              local: legacyLocal,
              remote: withDerivedData(remote.data),
              remoteUpdatedAt: remote.updated_at,
            })
          );
        } else if (legacyLocal) {
          const migrated = stampStoreMeta(
            withDerivedData({
              ...legacyLocal,
              loja: { ...legacyLocal.loja, slug },
            })
          );
          await upsertStoreState(slug, migrated);
          applyState(migrated);
        } else {
          const seeded = stampStoreMeta(createEmptyStoreSeed(slug));
          await upsertStoreState(slug, seeded);
          applyState(seeded);
        }
      } catch (error) {
        console.error('Falha ao carregar estado do Supabase:', error?.message || error);
        setSaveError('Não foi possível sincronizar com o Supabase. Verifique sua conexão.');
        const legacyLocal = readLegacyLocalStorageState();
        applyState(legacyLocal || withDerivedData(DEFAULT_ADMIN_DATA));
      } finally {
        setReady(true);
      }
    })();
  }, [applyState]);

  useEffect(() => {
    const sync = (event) => {
      if (event?.detail) {
        applyState(event.detail);
      }
    };
    window.addEventListener('admin-data-updated', sync);
    return () => window.removeEventListener('admin-data-updated', sync);
  }, [applyState]);

  const saveData = useCallback(
    (updater) => {
      const run = async () => {
        const prev = dataRef.current;
        const rawNext =
          typeof updater === 'function' ? updater(prev) : updater;
        const next = stampStoreMeta(withDerivedData(rawNext));
        const slug = resolveSlug(next);

        applyState(next);
        setSaving(true);
        setSaveError('');

        try {
          await upsertStoreState(slug, next);
          setLastSavedAt(new Date().toISOString());
          window.dispatchEvent(new CustomEvent('admin-data-updated', { detail: next }));
        } catch (error) {
          console.error('Falha ao salvar no Supabase:', error?.message || error);
          applyState(prev);
          setSaveError(error?.message || 'Erro ao salvar. Tente novamente.');
          throw error;
        } finally {
          setSaving(false);
        }

        return next;
      };

      saveQueueRef.current = saveQueueRef.current.then(run, run);
      return saveQueueRef.current;
    },
    [applyState]
  );

  const value = useMemo(
    () => ({
      data,
      saveData,
      ready,
      saving,
      saveError,
      lastSavedAt,
      refreshFromRemote,
      clearSaveError: () => setSaveError(''),
    }),
    [data, saveData, ready, saving, saveError, lastSavedAt, refreshFromRemote]
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminDataContext() {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error('useAdminData deve ser usado dentro de AdminDataProvider.');
  }
  return ctx;
}
