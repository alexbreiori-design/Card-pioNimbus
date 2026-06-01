/** Fuso padrão das lojas (horários configurados em Minha loja). */
export const DEFAULT_STORE_TIMEZONE = 'America/Sao_Paulo';

export const WEEKDAY_KEYS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const WEEKDAY_SHORT_TO_INDEX = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function parseTimeToMinutes(timeStr) {
  const match = String(timeStr || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getScheduleContext(date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE) {
  const weekdayShort = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const dayIndex = WEEKDAY_SHORT_TO_INDEX[weekdayShort];
  const dayKey = WEEKDAY_KEYS[dayIndex] ?? WEEKDAY_KEYS[date.getDay()];

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);

  return {
    dayKey,
    nowMinutes: hour * 60 + minute,
  };
}

/**
 * Verifica se a loja está aberta no horário atual com base nos horários semanais.
 * Respeita `fechado`, `abertura` e `fechamento` do dia corrente.
 */
export function isStoreOpenBySchedule(horarios, date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE) {
  if (!horarios || typeof horarios !== 'object') return true;

  const { dayKey, nowMinutes } = getScheduleContext(date, timeZone);
  const day = horarios[dayKey];
  if (!day || day.fechado) return false;

  const openMinutes = parseTimeToMinutes(day.abertura);
  const closeMinutes = parseTimeToMinutes(day.fechamento);
  if (openMinutes === null || closeMinutes === null) return false;
  if (openMinutes === closeMinutes) return false;

  if (closeMinutes > openMinutes) {
    return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  }

  // Madrugada: ex. 22:00 → 02:00
  return nowMinutes >= openMinutes || nowMinutes < closeMinutes;
}

/** Aplica o status aberta/fechada derivado dos horários sobre o objeto loja. */
export function applyScheduleOpenStatus(loja, date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE) {
  if (!loja || typeof loja !== 'object') return loja;
  return {
    ...loja,
    aberta: isStoreOpenBySchedule(loja.horarios, date, timeZone),
  };
}
