import { storeHasEmbeddedImages } from '@/lib/storage/normalizeStoreImages';

export const STORE_STATE_WARN_BYTES = 100 * 1024;
export const STORE_STATE_MAX_BYTES = 512 * 1024;

export function estimateJsonBytes(value) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  } catch {
    return 0;
  }
}

export function assessStoreStateSize(state) {
  const bytes = estimateJsonBytes(state);
  const hasEmbeddedImages = storeHasEmbeddedImages(state);
  return {
    bytes,
    kb: Math.round((bytes / 1024) * 10) / 10,
    warn: bytes >= STORE_STATE_WARN_BYTES,
    blocked: bytes >= STORE_STATE_MAX_BYTES,
    hasEmbeddedImages,
  };
}

export function formatStoreStateSizeMessage(report) {
  if (!report) return '';
  if (report.blocked) {
    return `O estado da loja está muito grande (${report.kb} KB). Remova imagens embutidas ou dados antigos antes de salvar.`;
  }
  if (report.hasEmbeddedImages) {
    return 'Ainda há imagens embutidas no JSON. Elas serão enviadas ao Storage no próximo salvamento.';
  }
  if (report.warn) {
    return `O estado da loja está grande (${report.kb} KB). Considere revisar dados legados ou imagens no JSON.`;
  }
  return '';
}
