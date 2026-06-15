import { fetchStoreStateRemote, saveStoreStateRemote } from '@/lib/storeStateClient';

/** @deprecated Prefer fetchStoreStateRemote — mantido para compatibilidade de imports. */
export async function fetchStoreStateBySlug(slug) {
  return fetchStoreStateRemote(slug, { scope: 'admin' });
}

/** @deprecated Prefer saveStoreStateRemote — mantido para compatibilidade de imports. */
export async function upsertStoreState(slug, state) {
  return saveStoreStateRemote(slug, state);
}
