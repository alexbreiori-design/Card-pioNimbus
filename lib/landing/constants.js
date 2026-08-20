import { getConfiguredDefaultSlug } from '@/lib/storeBoot';

export const NIMBUS_WHATSAPP = '5543991223322';

/** Preço mensal padrão (exibição na landing e copy geral). */
export const NIMBUS_PRICE = 'R$ 199,90';

/** Equivalente mensal no plano anual (exibição na landing). */
export const NIMBUS_PRICE_ANNUAL = 'R$ 149,90';

/** Loja usada na demo da landing (segue DEFAULT_STORE_SLUG do ambiente). */
export const NIMBUS_DEMO_SLUG = getConfiguredDefaultSlug();

export const NIMBUS_WHATSAPP_DEFAULT_MESSAGE =
  'Olá! Quero saber mais sobre o Cardápio Nimbus e colocar minha loja no ar.';

export function whatsappUrl(message = NIMBUS_WHATSAPP_DEFAULT_MESSAGE) {
  return `https://wa.me/${NIMBUS_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
