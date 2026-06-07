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

export function getMarmitaWeekdayLabel(dayKey) {
  return MARMITA_WEEKDAYS.find((day) => day.id === dayKey)?.label || dayKey || '—';
}

export function isValidMarmitaWeekday(dayKey) {
  return WEEKDAY_KEYS.includes(dayKey);
}
