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
  { value: 80, label: '80 mm' },
  { value: 58, label: '58 mm' },
];

/** Evento disparado no admin quando um pedido novo entra em Novos (Kanban). */
export const AUTO_PRINT_NEW_ORDER_EVENT = 'nimbus:auto-print-order';

const PRINT_MODE_KEY = 'admin_order_print_mode';
const PRINT_ON_PREP_KEY = 'admin_order_print_on_prep';
const PRINT_ON_NEW_KEY = 'admin_order_print_on_new';

export const ORDER_PRINT_MODE = {
  AUTO_NEW: 'auto_new',
  AUTO_PREP: 'auto_prep',
  ASK_PREP: 'ask_prep',
  MANUAL: 'manual',
};

const PRINT_MODE_VALUES = new Set(Object.values(ORDER_PRINT_MODE));

function migratePrintModeFromLegacy() {
  if (typeof window === 'undefined') return ORDER_PRINT_MODE.ASK_PREP;
  if (window.localStorage.getItem(PRINT_ON_NEW_KEY) === 'always') {
    return ORDER_PRINT_MODE.AUTO_NEW;
  }
  if (window.localStorage.getItem(PRINT_ON_PREP_KEY) === 'always') {
    return ORDER_PRINT_MODE.AUTO_PREP;
  }
  return ORDER_PRINT_MODE.ASK_PREP;
}

export function getOrderPrintMode() {
  if (typeof window === 'undefined') return ORDER_PRINT_MODE.ASK_PREP;
  const raw = window.localStorage.getItem(PRINT_MODE_KEY);
  if (PRINT_MODE_VALUES.has(raw)) return raw;
  const migrated = migratePrintModeFromLegacy();
  window.localStorage.setItem(PRINT_MODE_KEY, migrated);
  return migrated;
}

export function setOrderPrintMode(mode) {
  if (typeof window === 'undefined') return;
  const value = PRINT_MODE_VALUES.has(mode) ? mode : ORDER_PRINT_MODE.ASK_PREP;
  window.localStorage.setItem(PRINT_MODE_KEY, value);
  // Mantém chaves legadas alinhadas (outros leitores / abas antigas).
  window.localStorage.setItem(
    PRINT_ON_NEW_KEY,
    value === ORDER_PRINT_MODE.AUTO_NEW ? 'always' : 'off'
  );
  window.localStorage.setItem(
    PRINT_ON_PREP_KEY,
    value === ORDER_PRINT_MODE.AUTO_PREP ? 'always' : 'ask'
  );
}

export function isOrderPrintOnNewEnabled() {
  return getOrderPrintMode() === ORDER_PRINT_MODE.AUTO_NEW;
}

export function shouldAutoPrintOnPrep() {
  return getOrderPrintMode() === ORDER_PRINT_MODE.AUTO_PREP;
}

export function shouldAskPrintOnPrep() {
  return getOrderPrintMode() === ORDER_PRINT_MODE.ASK_PREP;
}

/** @deprecated use getOrderPrintMode / shouldAutoPrintOnPrep */
export function getOrderPrintOnPrepMode() {
  return shouldAutoPrintOnPrep() ? 'always' : 'ask';
}

/** @deprecated use setOrderPrintMode */
export function setOrderPrintOnPrepMode(mode) {
  if (mode === 'always') setOrderPrintMode(ORDER_PRINT_MODE.AUTO_PREP);
  else if (getOrderPrintMode() === ORDER_PRINT_MODE.AUTO_PREP) {
    setOrderPrintMode(ORDER_PRINT_MODE.ASK_PREP);
  }
}

/** @deprecated use getOrderPrintMode / isOrderPrintOnNewEnabled */
export function getOrderPrintOnNewMode() {
  return isOrderPrintOnNewEnabled() ? 'always' : 'off';
}

/** @deprecated use setOrderPrintMode */
export function setOrderPrintOnNewMode(mode) {
  if (mode === 'always') setOrderPrintMode(ORDER_PRINT_MODE.AUTO_NEW);
  else if (getOrderPrintMode() === ORDER_PRINT_MODE.AUTO_NEW) {
    setOrderPrintMode(ORDER_PRINT_MODE.ASK_PREP);
  }
}

export const ORDER_PRINT_MODE_OPTIONS = [
  {
    value: ORDER_PRINT_MODE.AUTO_NEW,
    label: 'Automático em Novos',
  },
  {
    value: ORDER_PRINT_MODE.AUTO_PREP,
    label: 'Automático em Preparo',
  },
  {
    value: ORDER_PRINT_MODE.ASK_PREP,
    label: 'Perguntar em Preparo',
  },
  {
    value: ORDER_PRINT_MODE.MANUAL,
    label: 'Só manual',
  },
];

/** Status inicial de pedidos lançados no admin (balcão). */
const MANUAL_INITIAL_STATUS_KEY = 'admin_manual_order_initial_status';

export const ADMIN_MANUAL_ORDER_INITIAL_STATUS = {
  NOVO: 'novo',
  EM_PREPARO: 'em_preparo',
};

const MANUAL_INITIAL_STATUS_VALUES = new Set(Object.values(ADMIN_MANUAL_ORDER_INITIAL_STATUS));

export function getAdminManualOrderInitialStatus() {
  if (typeof window === 'undefined') return ADMIN_MANUAL_ORDER_INITIAL_STATUS.EM_PREPARO;
  const raw = window.localStorage.getItem(MANUAL_INITIAL_STATUS_KEY);
  if (MANUAL_INITIAL_STATUS_VALUES.has(raw)) return raw;
  return ADMIN_MANUAL_ORDER_INITIAL_STATUS.EM_PREPARO;
}

export function setAdminManualOrderInitialStatus(status) {
  if (typeof window === 'undefined') return;
  const value = MANUAL_INITIAL_STATUS_VALUES.has(status)
    ? status
    : ADMIN_MANUAL_ORDER_INITIAL_STATUS.EM_PREPARO;
  window.localStorage.setItem(MANUAL_INITIAL_STATUS_KEY, value);
}

export const ADMIN_MANUAL_ORDER_INITIAL_STATUS_OPTIONS = [
  {
    value: ADMIN_MANUAL_ORDER_INITIAL_STATUS.EM_PREPARO,
    label: 'Em preparo',
  },
  {
    value: ADMIN_MANUAL_ORDER_INITIAL_STATUS.NOVO,
    label: 'Novos',
  },
];
