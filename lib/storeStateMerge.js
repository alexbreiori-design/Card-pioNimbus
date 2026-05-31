import { withDerivedData } from '@/lib/adminData';

export function stampStoreMeta(state, { revisionBump = true } = {}) {
  const prev = state?._meta || {};
  const revision = revisionBump ? Number(prev.revision || 0) + 1 : Number(prev.revision || 0);
  return {
    ...state,
    _meta: {
      ...prev,
      revision,
      clientUpdatedAt: new Date().toISOString(),
    },
  };
}

export function getClientUpdatedAt(state) {
  const value = state?._meta?.clientUpdatedAt;
  return value ? new Date(value).getTime() : 0;
}

export function mergeStoreStates({ local, remote, remoteUpdatedAt }) {
  const localStamp = getClientUpdatedAt(local);
  const remoteStamp = remoteUpdatedAt ? new Date(remoteUpdatedAt).getTime() : 0;

  if (!remote) return withDerivedData(stampStoreMeta(local || {}, { revisionBump: false }));
  if (!local || !localStamp) return withDerivedData(remote);

  if (localStamp >= remoteStamp) {
    return withDerivedData(stampStoreMeta(local, { revisionBump: false }));
  }

  return withDerivedData(remote);
}
