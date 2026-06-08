export const NIMBUS_WHATSAPP = '5543991223322';

export const NIMBUS_PRICE = 'R$ 149,90';

export const NIMBUS_DEMO_SLUG = 'nimbus-burger';

export const NIMBUS_WHATSAPP_DEFAULT_MESSAGE =
  'Olá! Quero saber mais sobre o Cardápio Nimbus e colocar minha loja no ar.';

export function whatsappUrl(message = NIMBUS_WHATSAPP_DEFAULT_MESSAGE) {
  return `https://wa.me/${NIMBUS_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
