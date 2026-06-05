const STORAGE_KEY = 'admin_order_ticket_width_mm';
const DEFAULT_WIDTH = 80;

export function getOrderTicketWidthMm() {
  if (typeof window === 'undefined') return DEFAULT_WIDTH;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = Number(raw);
  return parsed === 58 ? 58 : DEFAULT_WIDTH;
}

export function setOrderTicketWidthMm(width) {
  if (typeof window === 'undefined') return;
  const value = Number(width) === 58 ? 58 : DEFAULT_WIDTH;
  window.localStorage.setItem(STORAGE_KEY, String(value));
}

export const ORDER_TICKET_WIDTH_OPTIONS = [
  { value: 80, label: '80 mm (padrão)' },
  { value: 58, label: '58 mm' },
];
