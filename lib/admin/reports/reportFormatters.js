export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPct(value) {
  const num = Number(value || 0);
  const sign = num > 0 ? '+' : '';
  return `${sign}${formatNumber(num, 1)}%`;
}

export const REPORT_FILTER_LABELS = {
  origem: {
    all: 'Todas',
    cardapio_online: 'Cardápio online',
    admin_manual: 'Balcão/Admin',
  },
  tipo: {
    all: 'Todos',
    delivery: 'Delivery',
    retirada: 'Retirada',
    balcao: 'Balcão',
  },
  pagamento: {
    all: 'Todas',
    pix: 'Pix',
    dinheiro: 'Dinheiro',
    credito: 'Crédito',
    debito: 'Débito',
  },
};

export function describeReportFilters(filters = {}) {
  const origem = REPORT_FILTER_LABELS.origem[filters.origem] || filters.origem || 'Todas';
  const tipo = REPORT_FILTER_LABELS.tipo[filters.tipo] || filters.tipo || 'Todos';
  const pagamento = REPORT_FILTER_LABELS.pagamento[filters.pagamento] || filters.pagamento || 'Todas';
  return `Origem: ${origem} · Tipo: ${tipo} · Pagamento: ${pagamento}`;
}
