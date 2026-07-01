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
import { normalizeStoreStateImages, storeHasEmbeddedImages } from '@/lib/storage/normalizeStoreImages';
import { fetchStoreStateMetaRemote, fetchStoreStateRemote, saveStoreStateRemote } from '@/lib/storeStateClient';
import { withTimeout } from '@/lib/fetchWithTimeout';

const BOOT_LOAD_TIMEOUT_MS = 30000;
import { uploadMenuAssetIfNeeded } from '@/lib/upload/menuAsset';

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
  const [saveWarning, setSaveWarning] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [activeSlug, setActiveSlug] = useState('');
  const [switchingStore, setSwitchingStore] = useState(false);

  const dataRef = useRef(data);
  const bootRef = useRef(false);
  const remoteLoadOkRef = useRef(false);
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

  const uploadStoreImage = useCallback(
    (storeSlug, dataUrl, folder) => uploadMenuAssetIfNeeded(storeSlug, dataUrl, { folder }),
    []
  );

  const persistStoreImages = useCallback(
    async (state, storeSlug) => {
      if (!storeSlug || !storeHasEmbeddedImages(state)) return state;
      return normalizeStoreStateImages(state, storeSlug, uploadStoreImage);
    },
    [uploadStoreImage]
  );

  const loadStoreForSlug = useCallback(
    async (slug, { legacyLocal = null } = {}) => {
      const remote = await fetchStoreStateRemote(slug, { scope: 'admin' });

      if (remote?.data) {
        remoteLoadOkRef.current = true;
        let merged = mergeStoreStates({
          local: legacyLocal,
          remote: withDerivedData(remote.data),
          remoteUpdatedAt: remote.updated_at,
        });

        try {
          const remoteProductCount = (remote.data.produtos || []).length;
          const mergedProductCount = (merged.produtos || []).length;
          const withStorageUrls = await persistStoreImages(merged, slug);
          if (withStorageUrls !== merged) {
            merged = stampStoreMeta(withDerivedData({ ...withStorageUrls, pedidos: [] }));
            if (remoteProductCount > 0 || mergedProductCount === 0) {
              await saveStoreStateRemote(slug, merged);
            }
          }
        } catch (error) {
          console.error('Falha ao migrar imagens para o Storage:', error?.message || error);
        }

        return applyState(merged);
      }

      const meta = await fetchStoreStateMetaRemote(slug, { scope: 'admin' });
      if (meta?.updated_at) {
        console.error(
          'Loja já existe no Supabase, mas a carga completa falhou. Seed vazio não será gravado.'
        );
        if (legacyLocal) {
          return applyState(stampStoreMeta(withDerivedData({ ...legacyLocal, pedidos: [] })));
        }
        throw new Error(
          'Não foi possível carregar os dados da loja. Recarregue a página ou tente novamente.'
        );
      }

      const seeded = stampStoreMeta(createEmptyStoreSeed(slug));
      await saveStoreStateRemote(slug, seeded);
      return applyState(seeded);
    },
    [applyState, persistStoreImages]
  );

  const refreshFromRemote = useCallback(
    async (slugOverride) => {
      const slug = slugOverride || activeSlugRef.current || resolveSlug(dataRef.current);
      if (!slug || !slugAllowed(membershipsRef.current, slug)) return dataRef.current;

      const remote = await fetchStoreStateRemote(slug, { scope: 'admin' });
      const merged = mergeStoreStates({
        local: dataRef.current,
        remote: remote?.data ? withDerivedData(remote.data) : null,
        remoteUpdatedAt: remote?.updated_at,
      });

      if (remote?.data) {
        remoteLoadOkRef.current = true;
      }

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

        await withTimeout(
          loadStoreForSlug(slug, { legacyLocal: legacyForMerge }),
          BOOT_LOAD_TIMEOUT_MS,
          'Tempo esgotado ao carregar dados da loja.'
        );
      } catch (error) {
        console.error('Falha ao carregar estado do Supabase:', error?.message || error);
        remoteLoadOkRef.current = false;
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

        if (!remoteLoadOkRef.current) {
          throw new Error(
            'Carregamento incompleto — salvamento bloqueado para proteger seus dados. Recarregue a página (Ctrl+Shift+R) e aguarde o catálogo aparecer antes de salvar.'
          );
        }

        let next = stampStoreMeta(
          withDerivedData({
            ...rawNext,
            loja: { ...rawNext.loja, slug: bootSlug },
            pedidos: [],
          })
        );

        next = await persistStoreImages(next, bootSlug);
        next = stampStoreMeta(withDerivedData({ ...next, pedidos: [] }));

        applyState(next);
        setSaving(true);
        setSaveError('');
        setSaveWarning('');

        try {
          const result = await saveStoreStateRemote(bootSlug, next);
          setLastSavedAt(new Date().toISOString());
          if (result?.sizeWarning) {
            setSaveWarning(result.sizeWarning);
            console.warn('[store-state]', result.sizeWarning);
          }
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
    [applyState, persistStoreImages]
  );

  const value = useMemo(
    () => ({
      data,
      saveData,
      ready,
      saving,
      saveError,
      saveWarning,
      lastSavedAt,
      refreshFromRemote,
      clearSaveError: () => setSaveError(''),
      clearSaveWarning: () => setSaveWarning(''),
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
      saveWarning,
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
