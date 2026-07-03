export function isOrderOverdue(order) {
  if (!order?.entregarAte) return false;
  if (order.status === 'concluido' || order.status === 'cancelado' || order.arquivado) return false;
  return Date.now() > new Date(order.entregarAte).getTime();
}
