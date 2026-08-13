import { DEFAULT_STORE_TIMEZONE } from '@/lib/storeHours';

const MS_DAY = 24 * 60 * 60 * 1000;
export const MAX_CUSTOM_RANGE_DAYS = 90;

export function zonedDateKey(ms, timeZone = DEFAULT_STORE_TIMEZONE) {
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

/** Último ms do dia civil (exclusive end = start do próximo dia). */
export function zonedDayEndExclusiveMs(dateKey, timeZone = DEFAULT_STORE_TIMEZONE) {
  const start = zonedDayStartMs(new Date(`${dateKey}T12:00:00`), timeZone);
  // Avança ~36h e pega o início do próximo dia civil
  const nextGuess = start + MS_DAY + 12 * 60 * 60 * 1000;
  const nextKey = zonedDateKey(nextGuess, timeZone);
  return zonedDayStartMs(new Date(`${nextKey}T12:00:00`), timeZone);
}

export function isValidDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

export function formatDateKeyLabel(dateKey) {
  const raw = String(dateKey || '');
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  return `${match[3]}/${match[2]}`;
}

export function normalizeReportPeriodDays(value) {
  if (value === 'custom' || value === 'Personalizado') return 'custom';
  const num = Number(value);
  if (num === 7) return 7;
  if (num === 30) return 30;
  return 0;
}

function countInclusiveDays(fromKey, toKey) {
  const from = new Date(`${fromKey}T12:00:00Z`).getTime();
  const to = new Date(`${toKey}T12:00:00Z`).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return 0;
  return Math.floor((to - from) / MS_DAY) + 1;
}

function shiftDateKey(dateKey, deltaDays) {
  const base = new Date(`${dateKey}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + deltaDays);
  return base.toISOString().slice(0, 10);
}

/**
 * Lista dateKeys inclusivos de fromKey até toKey (UTC calendar approx — keys já são YYYY-MM-DD).
 */
export function listDateKeysInclusive(fromKey, toKey) {
  const keys = [];
  if (!isValidDateKey(fromKey) || !isValidDateKey(toKey) || toKey < fromKey) return keys;
  let cursor = fromKey;
  while (cursor <= toKey) {
    keys.push(cursor);
    cursor = shiftDateKey(cursor, 1);
    if (keys.length > MAX_CUSTOM_RANGE_DAYS + 5) break;
  }
  return keys;
}

export function resolveCustomPeriodWindow(
  fromKey,
  toKey,
  now = Date.now(),
  timeZone = DEFAULT_STORE_TIMEZONE
) {
  if (!isValidDateKey(fromKey) || !isValidDateKey(toKey)) {
    throw new Error('Informe um intervalo de datas válido (AAAA-MM-DD).');
  }
  let from = fromKey;
  let to = toKey;
  if (to < from) {
    const tmp = from;
    from = to;
    to = tmp;
  }

  const days = countInclusiveDays(from, to);
  if (days < 1) {
    throw new Error('Intervalo de datas inválido.');
  }
  if (days > MAX_CUSTOM_RANGE_DAYS) {
    throw new Error(`O período personalizado pode ter no máximo ${MAX_CUSTOM_RANGE_DAYS} dias.`);
  }

  const todayKey = zonedDateKey(now, timeZone);
  if (to > todayKey) to = todayKey;
  if (from > to) from = to;

  const currentStart = zonedDayStartMs(new Date(`${from}T12:00:00`), timeZone);
  let currentEnd = zonedDayEndExclusiveMs(to, timeZone) - 1;
  if (to === todayKey) currentEnd = Math.min(currentEnd, now);

  const dayCount = countInclusiveDays(from, to);
  const prevTo = shiftDateKey(from, -1);
  const prevFrom = shiftDateKey(prevTo, -(dayCount - 1));
  const previousStart = zonedDayStartMs(new Date(`${prevFrom}T12:00:00`), timeZone);
  const previousEnd = currentStart;

  const fromLabel = formatDateKeyLabel(from);
  const toLabel = formatDateKeyLabel(to);

  return {
    periodDays: 'custom',
    periodLabel: from === to ? fromLabel : `${fromLabel} – ${toLabel}`,
    compareLabel: `Comparado com os ${dayCount} dia${dayCount === 1 ? '' : 's'} anteriores`,
    currentStart,
    currentEnd,
    previousStart,
    previousEnd,
    fromKey: from,
    toKey: to,
  };
}

export function resolveReportPeriodWindow(
  periodDays,
  now = Date.now(),
  timeZone = DEFAULT_STORE_TIMEZONE,
  options = {}
) {
  const safeDays = normalizeReportPeriodDays(periodDays);

  if (safeDays === 'custom' || (options.from && options.to)) {
    return resolveCustomPeriodWindow(
      options.from || options.fromKey,
      options.to || options.toKey,
      now,
      timeZone
    );
  }

  if (safeDays === 0) {
    const todayStart = zonedDayStartMs(new Date(now), timeZone);
    const yesterdayStart = zonedDayStartMs(new Date(todayStart - 1), timeZone);
    const todayKey = zonedDateKey(now, timeZone);

    return {
      periodDays: 0,
      periodLabel: 'Hoje',
      compareLabel: 'Comparado com ontem',
      currentStart: todayStart,
      currentEnd: now,
      previousStart: yesterdayStart,
      previousEnd: todayStart,
      fromKey: todayKey,
      toKey: todayKey,
    };
  }

  if (safeDays === 30) {
    const currentStart = now - 30 * MS_DAY;
    return {
      periodDays: 30,
      periodLabel: 'Últimos 30 dias',
      compareLabel: 'Comparado com os 30 dias anteriores',
      currentStart,
      currentEnd: now,
      previousStart: now - 60 * MS_DAY,
      previousEnd: now - 30 * MS_DAY,
      fromKey: zonedDateKey(currentStart, timeZone),
      toKey: zonedDateKey(now, timeZone),
    };
  }

  const currentStart = now - 7 * MS_DAY;
  return {
    periodDays: 7,
    periodLabel: 'Últimos 7 dias',
    compareLabel: 'Comparado com os 7 dias anteriores',
    currentStart,
    currentEnd: now,
    previousStart: now - 14 * MS_DAY,
    previousEnd: now - 7 * MS_DAY,
    fromKey: zonedDateKey(currentStart, timeZone),
    toKey: zonedDateKey(now, timeZone),
  };
}
