import { normalizePhone } from '@/lib/normalize';

/** Contato de suporte Nimbus no admin (WhatsApp preferencial). */
export const NIMBUS_SUPPORT_LABEL = 'Suporte';

const DEFAULT_SITE = 'https://cardapionimbus.com.br';

/** Monta URL wa.me a partir de telefone com DDI. */
export function buildNimbusWhatsAppUrl(phone) {
  let digits = normalizePhone(phone);
  if (!digits || digits.length < 10) return null;
  if (!digits.startsWith('55')) digits = `55${digits}`;
  return `https://wa.me/${digits}`;
}

/** Fallback quando perfil/ENV não têm WhatsApp. */
export function getDefaultNimbusSupportUrl() {
  const fromEnv = String(process.env.NEXT_PUBLIC_NIMBUS_SUPPORT_URL || '').trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_SITE;
}

/** URL estática para import em client (substituída após fetch do perfil). */
export const NIMBUS_SUPPORT_URL = getDefaultNimbusSupportUrl();

export function resolveNimbusSupportUrl({ whatsappSuporte } = {}) {
  const waUrl = buildNimbusWhatsAppUrl(whatsappSuporte);
  if (waUrl) return waUrl;
  return getDefaultNimbusSupportUrl();
}
