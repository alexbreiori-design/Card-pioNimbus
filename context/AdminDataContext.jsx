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
import { pickActiveStoreSlug, writeActiveStoreSlug } from '@/lib/adminStoreSession';
import { mergeStoreStates, stampStoreMeta } from '@/lib/storeStateMerge';
import { createEmptyStoreSeed, readLegacyLocalStorageState } from '@/lib/storeBoot';
import { fetchUserMembershipsClient } from '@/lib/supabase/membershipsClient';
import { fetchStoreStateBySlug, upsertStoreState } from '@/lib/supabase/storeState';

const AdminDataContext = createContext(null);

function resolveSlug(data) {
  return String(data?.loja?.slug || '')
    .trim()
    .toLowerCase();
}

function slugAllowed(memberships, slug) {
  const safe = String(slug || '').trim().toLowerCase();
  return memberships.some((m) => m.slug === safe);
}

export function AdminDataProvider({ children }) {
  const [data, setData] = useState(() => withDerivedData(DEFAULT_ADMIN_DATA));
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [activeSlug, setActiveSlug] = useState('');
  const [switchingStore, setSwitchingStore] = useState(false);

  const dataRef = useRef(data);
  const bootRef = useRef(false);
  const saveQueueRef = useRef(Promise.resolve());
  const membershipsRef = useRef(memberships);
  const activeSlugRef = useRef(activeSlug);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    membershipsRef.current = memberships;
  }, [memberships]);

  useEffect(() => {
    activeSlugRef.current = activeSlug;
  }, [activeSlug]);

  const applyState = useCallback((next) => {
    const derived = withDerivedData({ ...next, pedidos: [] });
    dataRef.current = derived;
    setData(derived);
    return derived;
  }, []);

  const loadStoreForSlug = useCallback(
    async (slug, { legacyLocal = null } = {}) => {
      const remote = await fetchStoreStateBySlug(slug);

      if (remote?.data) {
        return applyState(
          mergeStoreStates({
            local: legacyLocal,
            remote: withDerivedData(remote.data),
            remoteUpdatedAt: remote.updated_at,
          })
        );
      }

      const seeded = stampStoreMeta(createEmptyStoreSeed(slug));
      await upsertStoreState(slug, seeded);
      return applyState(seeded);
    },
    [applyState]
  );

  const refreshFromRemote = useCallback(
    async (slugOverride) => {
      const slug = slugOverride || activeSlugRef.current || resolveSlug(dataRef.current);
      if (!slug || !slugAllowed(membershipsRef.current, slug)) return dataRef.current;

      const remote = await fetchStoreStateBySlug(slug);
      const merged = mergeStoreStates({
        local: dataRef.current,
        remote: remote?.data ? withDerivedData(remote.data) : null,
        remoteUpdatedAt: remote?.updated_at,
      });

      return applyState(merged);
    },
    [applyState]
  );

  const switchStore = useCallback(
    async (nextSlug) => {
      const safeSlug = String(nextSlug || '').trim().toLowerCase();
      if (!safeSlug || !slugAllowed(membershipsRef.current, safeSlug)) {
        throw new Error('Loja não disponível para este usuário.');
      }
      if (safeSlug === activeSlugRef.current) return dataRef.current;

      setSwitchingStore(true);
      setSaveError('');
      try {
        writeActiveStoreSlug(safeSlug);
        setActiveSlug(safeSlug);
        return await loadStoreForSlug(safeSlug);
      } finally {
        setSwitchingStore(false);
      }
    },
    [loadStoreForSlug]
  );

  useEffect(() => {
    if (bootRef.current) return;
    bootRef.current = true;

    (async () => {
      try {
        const userMemberships = await fetchUserMembershipsClient();
        setMemberships(userMemberships);

        if (!userMemberships.length) {
          setReady(true);
          return;
        }

        const slug = pickActiveStoreSlug(userMemberships);
        writeActiveStoreSlug(slug);
        setActiveSlug(slug);

        const legacyLocal = readLegacyLocalStorageState();
        const legacySlug = legacyLocal?.loja?.slug?.toLowerCase();
        const legacyForMerge =
          legacyLocal && legacySlug === slug ? legacyLocal : null;

        await loadStoreForSlug(slug, { legacyLocal: legacyForMerge });
      } catch (error) {
        console.error('Falha ao carregar estado do Supabase:', error?.message || error);
        setSaveError('Não foi possível sincronizar com o Supabase. Verifique sua conexão.');
        const legacyLocal = readLegacyLocalStorageState();
        applyState(legacyLocal || withDerivedData(DEFAULT_ADMIN_DATA));
      } finally {
        setReady(true);
      }
    })();
  }, [applyState, loadStoreForSlug]);

  useEffect(() => {
    const sync = (event) => {
      if (!event?.detail) return;
      const incomingSlug = resolveSlug(event.detail);
      if (incomingSlug && incomingSlug !== activeSlugRef.current) return;
      applyState(event.detail);
    };

    window.addEventListener('admin-data-updated', sync);
    return () => window.removeEventListener('admin-data-updated', sync);
  }, [applyState]);

  const saveData = useCallback(
    (updater) => {
      const run = async () => {
        const prev = dataRef.current;
        const rawNext = typeof updater === 'function' ? updater(prev) : updater;
        const bootSlug = activeSlugRef.current;

        if (!bootSlug || !slugAllowed(membershipsRef.current, bootSlug)) {
          throw new Error('Sem permissão para salvar nesta loja.');
        }

        const next = stampStoreMeta(
          withDerivedData({
            ...rawNext,
            loja: { ...rawNext.loja, slug: bootSlug },
            pedidos: [],
          })
        );

        applyState(next);
        setSaving(true);
        setSaveError('');

        try {
          await upsertStoreState(bootSlug, next);
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
      memberships,
      activeSlug,
      switchStore,
      switchingStore,
    }),
    [
      data,
      saveData,
      ready,
      saving,
      saveError,
      lastSavedAt,
      refreshFromRemote,
      memberships,
      activeSlug,
      switchStore,
      switchingStore,
    ]
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
