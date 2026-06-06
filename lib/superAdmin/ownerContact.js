import { buildNotifyCustomerUrl } from '@/lib/orderWhatsApp';
import { normalizePhone } from '@/lib/normalize';

export function resolveOwnerPhone({ empresaTelefone, lojaTelefone, lojaWhatsapp }) {
  const candidates = [lojaWhatsapp, lojaTelefone, empresaTelefone];
  for (const value of candidates) {
    const digits = normalizePhone(value);
    if (digits && digits.length >= 10) return value;
  }
  return '';
}

export function buildOwnerWhatsAppUrl(phone, message) {
  const text =
    message ||
    'Olá! Aqui é da Nimbus. Estou entrando em contato sobre o cardápio digital da sua loja.';
  return buildNotifyCustomerUrl(phone, text);
}
