import { WEEKDAY_KEYS } from '@/lib/storeHours';

export const MARMITA_WEEKDAYS = [
  { id: 'segunda', label: 'Segunda-feira' },
  { id: 'terca', label: 'Terça-feira' },
  { id: 'quarta', label: 'Quarta-feira' },
  { id: 'quinta', label: 'Quinta-feira' },
  { id: 'sexta', label: 'Sexta-feira' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
];

export const MARMITA_DAY_OPTIONS = [
  { id: 'todos', label: 'Todos os dias' },
  ...MARMITA_WEEKDAYS,
];

export function normalizeMarmitaDiaSemana(dayKey) {
  const key = String(dayKey || '').trim();
  if (!key || key === 'todos') return 'todos';
  return key;
}

export function getMarmitaWeekdayLabel(dayKey) {
  const normalized = normalizeMarmitaDiaSemana(dayKey);
  if (normalized === 'todos') return 'Todos os dias';
  return MARMITA_WEEKDAYS.find((day) => day.id === normalized)?.label || normalized || '—';
}

export function marmitaDaysOverlap(diaA, diaB) {
  const a = normalizeMarmitaDiaSemana(diaA);
  const b = normalizeMarmitaDiaSemana(diaB);
  if (a === 'todos' || b === 'todos') return true;
  return a === b;
}

export function isValidMarmitaWeekday(dayKey) {
  return WEEKDAY_KEYS.includes(dayKey);
}
