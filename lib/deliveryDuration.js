/** Duração padrão (HH:MM) — não é horário fixo do relógio. */
export const DEFAULT_DELIVERY_DURATION = '00:45';
export const DEFAULT_PICKUP_DURATION = '00:30';

export function minutesToHHMM(totalMinutes) {
  const mins = Math.max(0, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseHHMMToMinutes(value) {
  const str = String(value || '').trim();
  if (!str) return null;
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes >= 60) return null;
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

/** Máscara de digitação para campo HH:MM (duração). */
export function formatHHMMInput(raw) {
  const digits = String(raw || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function normalizeHHMM(value, fallback = DEFAULT_DELIVERY_DURATION) {
  const minutes = parseHHMMToMinutes(value);
  if (minutes === null) return fallback;
  return minutesToHHMM(minutes);
}

function legacyMinutesToHHMM(loja) {
  if (loja?.tempoEntregaValor === undefined || loja?.tempoEntregaValor === null || loja?.tempoEntregaValor === '') {
    return null;
  }
  const value = Math.max(1, Number(loja.tempoEntregaValor || 45));
  const minutes = loja?.tempoEntregaUnidade === 'horas' ? value * 60 : value;
  return minutesToHHMM(minutes);
}

function normalizeOptionalMinHHMM(value) {
  const str = String(value || '').trim();
  if (!str) return '';
  const minutes = parseHHMMToMinutes(str);
  if (minutes === null) return '';
  return minutesToHHMM(minutes);
}

function resolveDurationPair(maxRaw, minRaw, fallbackMax) {
  const max = normalizeHHMM(maxRaw, '');
  const maxMinutes = parseHHMMToMinutes(max);
  const resolvedMax = maxMinutes ? max : fallbackMax;
  const resolvedMaxMinutes = parseHHMMToMinutes(resolvedMax) || parseHHMMToMinutes(fallbackMax);

  let min = normalizeOptionalMinHHMM(minRaw);
  const minMinutes = parseHHMMToMinutes(min);
  if (!minMinutes || !resolvedMaxMinutes || minMinutes >= resolvedMaxMinutes) {
    min = '';
  }

  return {
    max: resolvedMax,
    min,
  };
}

/** Resolve durações da loja (migra campos legados valor + unidade). */
export function resolveLojaDurations(loja = {}) {
  const legacy = legacyMinutesToHHMM(loja);
  let tempoEntregaDelivery = normalizeHHMM(loja.tempoEntregaDelivery, '');
  let tempoEntregaRetirada = normalizeHHMM(loja.tempoEntregaRetirada, '');

  if (!parseHHMMToMinutes(tempoEntregaDelivery) && legacy) {
    tempoEntregaDelivery = legacy;
  }
  if (!parseHHMMToMinutes(tempoEntregaRetirada)) {
    tempoEntregaRetirada = parseHHMMToMinutes(tempoEntregaDelivery)
      ? tempoEntregaDelivery
      : legacy || DEFAULT_PICKUP_DURATION;
  }
  if (!parseHHMMToMinutes(tempoEntregaDelivery)) {
    tempoEntregaDelivery = DEFAULT_DELIVERY_DURATION;
  }

  const delivery = resolveDurationPair(
    tempoEntregaDelivery,
    loja.tempoEntregaDeliveryMin,
    DEFAULT_DELIVERY_DURATION
  );
  const pickup = resolveDurationPair(
    tempoEntregaRetirada,
    loja.tempoEntregaRetiradaMin,
    DEFAULT_PICKUP_DURATION
  );

  return {
    tempoEntregaDelivery: delivery.max,
    tempoEntregaDeliveryMin: delivery.min,
    tempoEntregaRetirada: pickup.max,
    tempoEntregaRetiradaMin: pickup.min,
  };
}

export function isDeliveryOrderTipo(tipo) {
  return tipo === 'delivery' || tipo === 'entregar';
}

export function getDurationMinutesRangeForOrderTipo(loja, tipo) {
  const durations = resolveLojaDurations(loja);
  const isDelivery = isDeliveryOrderTipo(tipo);
  const maxHhmm = isDelivery ? durations.tempoEntregaDelivery : durations.tempoEntregaRetirada;
  const minHhmm = isDelivery ? durations.tempoEntregaDeliveryMin : durations.tempoEntregaRetiradaMin;
  const fallback = isDelivery ? DEFAULT_DELIVERY_DURATION : DEFAULT_PICKUP_DURATION;
  const max = parseHHMMToMinutes(maxHhmm) || parseHHMMToMinutes(fallback) || 45;
  const minParsed = parseHHMMToMinutes(minHhmm);
  const min = minParsed !== null && minParsed < max ? minParsed : max;
  return { min, max };
}

export function hasDurationRangeForOrderTipo(loja, tipo) {
  const { min, max } = getDurationMinutesRangeForOrderTipo(loja, tipo);
  return min < max;
}

export function getEstimateMinutesForOrderTipo(loja, tipo) {
  return getDurationMinutesRangeForOrderTipo(loja, tipo).max;
}

/** Horário limite = confirmação do pedido + duração máxima configurada. */
export function getEtaFromConfirmedAt(createdAt, loja, tipo) {
  const { max } = getDurationMinutesRangeForOrderTipo(loja, tipo);
  return new Date(new Date(createdAt).getTime() + max * 60000);
}

/** Faixa de horários limite a partir da confirmação do pedido. */
export function getEtaRangeFromConfirmedAt(createdAt, loja, tipo) {
  const base = new Date(createdAt).getTime();
  const { min, max } = getDurationMinutesRangeForOrderTipo(loja, tipo);
  return {
    min: new Date(base + min * 60000),
    max: new Date(base + max * 60000),
  };
}

/** Rótulo amigável para exibir duração (ex.: 45 min, 1h 30min). */
export function formatDurationMinutes(totalMinutes) {
  const mins = Math.max(1, Math.round(Number(totalMinutes) || 0));
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours && minutes) return `${hours}h ${minutes}min`;
  if (hours) return `${hours}h`;
  return `${minutes} min`;
}

/** Rótulo de faixa (ex.: 45 min ou 35 min - 1h). */
export function formatDurationMinutesRange(minMinutes, maxMinutes) {
  const min = Math.max(1, Math.round(Number(minMinutes) || 0));
  const max = Math.max(min, Math.round(Number(maxMinutes) || 0));
  if (min >= max) return formatDurationMinutes(max);
  return `${formatDurationMinutes(min)} - ${formatDurationMinutes(max)}`;
}

export function getDurationLabelForOrderTipo(loja, tipo) {
  const { min, max } = getDurationMinutesRangeForOrderTipo(loja, tipo);
  return formatDurationMinutesRange(min, max);
}

export function getCheckoutTipoFromDeliveryMode(deliveryMode) {
  return deliveryMode === 'entregar' ? 'delivery' : 'retirada';
}
