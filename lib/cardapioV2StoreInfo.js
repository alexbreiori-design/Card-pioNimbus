import { WEEKDAY_KEYS } from '@/lib/storeHours';

/** Ordem de exibição no rodapé (segunda → domingo). */
export const FOOTER_WEEKDAY_ORDER = [
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
  'domingo',
];

export const FOOTER_WEEKDAY_LABELS = {
  domingo: 'Domingo',
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
};

export function formatFooterDaySchedule(day) {
  if (!day || day.fechado) return 'Fechado';
  const open = String(day.abertura || '').trim();
  const close = String(day.fechamento || '').trim();
  if (!open || !close) return 'Fechado';
  return `${open} – ${close}`;
}

export function getFooterTodayKey() {
  return WEEKDAY_KEYS[new Date().getDay()];
}

export function buildWhatsAppUrl(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

export function buildMapsSearchUrl(addressText) {
  const query = String(addressText || '').trim();
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatDocumentoFiscal(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 14) return String(value || '').trim();
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function buildFooterPaymentLabels(exibirPixCardapio = true) {
  const labels = [];
  if (exibirPixCardapio !== false) labels.push('Pix');
  labels.push('Dinheiro', 'Cartão de crédito', 'Cartão de débito');
  return labels;
}
