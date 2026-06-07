export const MARMITA_PRODUCT_ID_SEP = ':';

export function buildMarmitaProductId(marmitaId, tamanhoId) {
  const base = String(marmitaId || '').trim();
  const size = String(tamanhoId || '').trim();
  if (!base || !size) return '';
  return `${base}${MARMITA_PRODUCT_ID_SEP}${size}`;
}

export function parseMarmitaProductId(productId) {
  const raw = String(productId || '').trim();
  const sepIndex = raw.indexOf(MARMITA_PRODUCT_ID_SEP);
  if (sepIndex <= 0) return null;
  const marmitaId = raw.slice(0, sepIndex);
  const tamanhoId = raw.slice(sepIndex + 1);
  if (!marmitaId || !tamanhoId) return null;
  return { marmitaId, tamanhoId };
}

export function isMarmitaProductId(productId) {
  return parseMarmitaProductId(productId) != null;
}
