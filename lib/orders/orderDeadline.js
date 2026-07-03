const WARNING_MS = 15 * 60 * 1000;

function isDeadlineActive(order) {
  if (!order?.entregarAte) return false;
  if (order.status === 'concluido' || order.status === 'cancelado' || order.arquivado) return false;
  return true;
}

export function getOrderDeadlineStatus(order) {
  if (!isDeadlineActive(order)) return null;

  const deadline = new Date(order.entregarAte).getTime();
  const now = Date.now();
  if (now > deadline) return 'overdue';
  if (deadline - now <= WARNING_MS) return 'warning';
  return 'ok';
}

export function isOrderOverdue(order) {
  return getOrderDeadlineStatus(order) === 'overdue';
}

export function isOrderDeadlineWarning(order) {
  return getOrderDeadlineStatus(order) === 'warning';
}

export function orderDeadlineHighlightClass(order) {
  const status = getOrderDeadlineStatus(order);
  if (status === 'overdue') return 'is-overdue';
  if (status === 'warning') return 'is-warning';
  return undefined;
}

export function orderDeadlineCardClass(order) {
  const status = getOrderDeadlineStatus(order);
  if (status === 'overdue') return 'admin-order-card--overdue';
  if (status === 'warning') return 'admin-order-card--warning';
  return '';
}
