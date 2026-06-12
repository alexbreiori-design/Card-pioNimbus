import { DEFAULT_STORE_TIMEZONE } from '@/lib/storeHours';

const MS_DAY = 24 * 60 * 60 * 1000;

function zonedDateKey(ms, timeZone = DEFAULT_STORE_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
}

/** Primeiro instante do dia civil no fuso da loja. */
export function zonedDayStartMs(date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE) {
  const dateKey = zonedDateKey(date.getTime(), timeZone);
  let lo = date.getTime() - 36 * MS_DAY;
  let hi = date.getTime() + 12 * MS_DAY;

  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (zonedDateKey(mid, timeZone) < dateKey) lo = mid;
    else hi = mid;
  }

  return zonedDateKey(hi, timeZone) === dateKey ? hi : lo;
}

export function normalizeReportPeriodDays(value) {
  const num = Number(value);
  if (num === 0) return 0;
  if (num === 30) return 30;
  return 7;
}

export function resolveReportPeriodWindow(periodDays, now = Date.now(), timeZone = DEFAULT_STORE_TIMEZONE) {
  const safeDays = normalizeReportPeriodDays(periodDays);

  if (safeDays === 0) {
    const todayStart = zonedDayStartMs(new Date(now), timeZone);
    const yesterdayStart = zonedDayStartMs(new Date(todayStart - 1), timeZone);

    return {
      periodDays: 0,
      periodLabel: 'Hoje',
      compareLabel: 'Comparado com ontem',
      currentStart: todayStart,
      currentEnd: now,
      previousStart: yesterdayStart,
      previousEnd: todayStart,
    };
  }

  if (safeDays === 30) {
    return {
      periodDays: 30,
      periodLabel: 'Últimos 30 dias',
      compareLabel: 'Comparado aos 30 dias anteriores',
      currentStart: now - 30 * MS_DAY,
      currentEnd: now,
      previousStart: now - 60 * MS_DAY,
      previousEnd: now - 30 * MS_DAY,
    };
  }

  return {
    periodDays: 7,
    periodLabel: 'Últimos 7 dias',
    compareLabel: 'Comparado aos 7 dias anteriores',
    currentStart: now - 7 * MS_DAY,
    currentEnd: now,
    previousStart: now - 14 * MS_DAY,
    previousEnd: now - 7 * MS_DAY,
  };
}
