export function formatTimeHHMM(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function hasOrderPrazoRange(order) {
  if (!order?.entregarAteMin || !order?.entregarAte) return false;
  const minTime = new Date(order.entregarAteMin).getTime();
  const maxTime = new Date(order.entregarAte).getTime();
  if (Number.isNaN(minTime) || Number.isNaN(maxTime)) return false;
  return minTime < maxTime;
}

export function formatOrderPrazoShort(order) {
  const maxLabel = order?.prazo || formatTimeHHMM(order?.entregarAte);
  if (!maxLabel) return '';
  if (!hasOrderPrazoRange(order)) return maxLabel;
  const minLabel = formatTimeHHMM(order.entregarAteMin);
  if (!minLabel) return maxLabel;
  return `${minLabel} e ${maxLabel}`;
}

function deliveryPhrasePrefix(tipo) {
  return tipo === 'delivery' || tipo === 'entregar' ? 'Entrega' : 'Retirada';
}

export function formatOrderPrazoPhrase(order) {
  const short = formatOrderPrazoShort(order);
  if (!short) return '';
  const prefix = deliveryPhrasePrefix(order?.tipo);
  if (hasOrderPrazoRange(order)) {
    return `${prefix} entre ${short}`;
  }
  return `${prefix} até ${short}`;
}

export function formatOrderPrazoForecastLabel(order) {
  const short = formatOrderPrazoShort(order);
  if (!short) return '';
  if (hasOrderPrazoRange(order)) return `Previsão: entre ${short}`;
  return `Previsão: ${short}`;
}

export function formatOrderPrazoWhatsAppLine(order) {
  const short = formatOrderPrazoShort(order);
  if (!short) return '';
  const isDelivery = order?.tipo === 'delivery';
  if (hasOrderPrazoRange(order)) {
    return isDelivery
      ? `Previsão de entrega: entre ${short}`
      : `Previsão para retirada: entre ${short}`;
  }
  return isDelivery
    ? `Previsão de entrega: até ${short}`
    : `Previsão para retirada: até ${short}`;
}
