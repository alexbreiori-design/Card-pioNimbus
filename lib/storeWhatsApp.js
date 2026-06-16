import { formatCartOptsList } from '@/lib/cardapio/formatCartOpts';
import { normalizePhone } from '@/lib/normalize';

/** Dígitos do telefone da loja para wa.me (com DDI 55). */
export function storePhoneDigitsForWa(storeConfig) {
  const raw = storeConfig?.whatsapp || storeConfig?.telefone || '';
  let digits = normalizePhone(raw);
  if (!digits || digits.length < 10) return '';
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return digits;
}

export function buildSendOrderToStoreUrl(storeConfig, message) {
  const phone = storePhoneDigitsForWa(storeConfig);
  if (!phone || !message) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** @deprecated Use buildSendOrderToStoreUrl com mensagem completa. */
export function buildStoreWhatsAppOrderUrl(storeConfig, { customerName, orderId }) {
  const name = (customerName || 'cliente').trim();
  const msg = `Olá, meu nome é ${name} e tenho uma dúvida sobre o pedido ${orderId}.`;
  return buildSendOrderToStoreUrl(storeConfig, msg);
}

export function buildOrderWhatsAppMessage({
  orderNumber,
  customerName,
  customerPhone,
  items = [],
  deliveryLabel,
  addressText,
  paymentLabel,
  subtotalFormatted,
  deliveryFeeFormatted,
  cupomOffFormatted,
  totalFormatted,
  isPix = false,
}) {
  const lines = [
    'Olá! Acabei de fazer um pedido pelo cardápio online.',
    '',
    `*Pedido #${orderNumber}*`,
    `Nome: ${customerName}`,
    `Telefone: ${customerPhone}`,
    '',
    '*Itens:*',
    ...items.map((item) => {
      const opts = item.opts?.length ? ` (${formatCartOptsList(item.opts)})` : '';
      return `• ${item.qty}x ${item.name}${opts} — ${item.lineTotal}`;
    }),
    '',
    `*${deliveryLabel}*`,
    addressText ? `Endereço: ${addressText}` : null,
    `Pagamento: ${paymentLabel}`,
    subtotalFormatted ? `Subtotal: ${subtotalFormatted}` : null,
    deliveryFeeFormatted ? `Taxa de entrega: ${deliveryFeeFormatted}` : null,
    cupomOffFormatted ? `Desconto cupom: − ${cupomOffFormatted}` : null,
    `*Total: ${totalFormatted}*`,
    isPix ? '\nVou enviar o comprovante do Pix nesta conversa.' : null,
  ].filter((line) => line !== null && line !== undefined);

  return lines.join('\n');
}
