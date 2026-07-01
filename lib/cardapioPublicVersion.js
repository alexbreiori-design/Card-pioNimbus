export const CARDAPIO_PUBLIC_VERSION_V1 = 'v1';
export const CARDAPIO_PUBLIC_VERSION_V2 = 'v2';

/** Normaliza valor do banco; ausente ou inválido → v1. */
export function normalizeCardapioPublicVersion(value) {
  return value === CARDAPIO_PUBLIC_VERSION_V2 ? CARDAPIO_PUBLIC_VERSION_V2 : CARDAPIO_PUBLIC_VERSION_V1;
}

export function isCardapioPublicV2(value) {
  return normalizeCardapioPublicVersion(value) === CARDAPIO_PUBLIC_VERSION_V2;
}
