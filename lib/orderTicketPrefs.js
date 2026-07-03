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

const PRINT_ON_PREP_KEY = 'admin_order_print_on_prep';
const PRINT_ON_PREP_ASK = 'ask';
const PRINT_ON_PREP_ALWAYS = 'always';

export function getOrderPrintOnPrepMode() {
  if (typeof window === 'undefined') return PRINT_ON_PREP_ASK;
  const raw = window.localStorage.getItem(PRINT_ON_PREP_KEY);
  return raw === PRINT_ON_PREP_ALWAYS ? PRINT_ON_PREP_ALWAYS : PRINT_ON_PREP_ASK;
}

export function setOrderPrintOnPrepMode(mode) {
  if (typeof window === 'undefined') return;
  const value = mode === PRINT_ON_PREP_ALWAYS ? PRINT_ON_PREP_ALWAYS : PRINT_ON_PREP_ASK;
  window.localStorage.setItem(PRINT_ON_PREP_KEY, value);
}

export const ORDER_PRINT_ON_PREP_OPTIONS = [
  { value: PRINT_ON_PREP_ASK, label: 'Perguntar ao avançar para preparo' },
  { value: PRINT_ON_PREP_ALWAYS, label: 'Imprimir automaticamente ao avançar para preparo' },
];
