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

  return {
    tempoEntregaDelivery,
    tempoEntregaRetirada,
  };
}

export function isDeliveryOrderTipo(tipo) {
  return tipo === 'delivery' || tipo === 'entregar';
}

export function getEstimateMinutesForOrderTipo(loja, tipo) {
  const { tempoEntregaDelivery, tempoEntregaRetirada } = resolveLojaDurations(loja);
  const hhmm = isDeliveryOrderTipo(tipo) ? tempoEntregaDelivery : tempoEntregaRetirada;
  return parseHHMMToMinutes(hhmm) || parseHHMMToMinutes(DEFAULT_DELIVERY_DURATION) || 45;
}

/** Horário limite = confirmação do pedido + duração configurada. */
export function getEtaFromConfirmedAt(createdAt, loja, tipo) {
  const minutes = getEstimateMinutesForOrderTipo(loja, tipo);
  return new Date(new Date(createdAt).getTime() + minutes * 60000);
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

export function getCheckoutTipoFromDeliveryMode(deliveryMode) {
  return deliveryMode === 'entregar' ? 'delivery' : 'retirada';
}
