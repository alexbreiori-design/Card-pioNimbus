import { normalizePhone } from '@/lib/normalize';

/** Dígitos do telefone da loja para wa.me (com DDI 55). */
export function storePhoneDigitsForWa(storeConfig) {
  const raw = storeConfig?.whatsapp || storeConfig?.telefone || '';
  let digits = normalizePhone(raw);
  if (!digits || digits.length < 10) return '';
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return digits;
}

export function buildStoreWhatsAppOrderUrl(storeConfig, { customerName, orderId }) {
  const phone = storePhoneDigitsForWa(storeConfig);
  if (!phone) return null;
  const name = (customerName || 'cliente').trim();
  const msg = `Olá, meu nome é ${name} e tenho uma dúvida sobre o pedido ${orderId}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
