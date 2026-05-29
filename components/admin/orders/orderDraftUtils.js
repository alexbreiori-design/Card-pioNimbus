export const ORDER_TYPES = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'retirada', label: 'Retirada' },
  { value: 'balcao', label: 'Balcão' },
];

export const PAYMENT_METHODS = [
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
];

export const EMPTY_ORDER_DRAFT = {
  tipo: 'delivery',
  telefone: '',
  clienteNome: '',
  cep: '',
  logradouro: '',
  numero: '',
  bairro: '',
  cidade: '',
  estado: '',
  complemento: '',
  observacao: '',
  acrescimo: '',
  desconto: '',
  cupomId: '',
  cupomCodigo: '',
  cupomDesconto: 0,
  taxaEntrega: '0',
  formaPagamento: 'dinheiro',
  cart: [],
};

export function fmtPhone(v) {
  const n = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

export function currency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

export function parseMoneyInput(value) {
  const parsed = Number(String(value || '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function computeOrderTotals(draft) {
  const subtotal = (draft.cart || []).reduce(
    (s, i) => s + Number(i.preco || 0) * Number(i.qtd || 1),
    0
  );
  const entrega = draft.tipo === 'delivery' ? parseMoneyInput(draft.taxaEntrega) : 0;
  const acrescimo = parseMoneyInput(draft.acrescimo);
  const descontoManual = parseMoneyInput(draft.desconto);
  const descontoCupom = Number(draft.cupomDesconto) || 0;
  const desconto = descontoManual + descontoCupom;
  const total = subtotal + entrega + acrescimo - desconto;
  return {
    subtotal,
    entrega,
    acrescimo,
    desconto,
    descontoManual,
    descontoCupom,
    total,
  };
}

export function isOrderDraftValid(draft) {
  if (!String(draft.clienteNome || '').trim()) return false;
  if (!String(draft.telefone || '').replace(/\D/g, '')) return false;
  if (!(draft.cart || []).length) return false;
  if (draft.tipo === 'delivery') {
    if (!String(draft.logradouro || '').trim()) return false;
    if (!String(draft.numero || '').trim()) return false;
  }
  return true;
}

export function hasDraftContent(draft) {
  if ((draft.cart || []).length) return true;
  if (String(draft.clienteNome || '').trim()) return true;
  if (String(draft.telefone || '').replace(/\D/g, '')) return true;
  if (String(draft.observacao || '').trim()) return true;
  if (parseMoneyInput(draft.acrescimo) > 0) return true;
  if (parseMoneyInput(draft.desconto) > 0) return true;
  if (draft.cupomId) return true;
  if (draft.tipo === 'delivery') {
    return ['cep', 'logradouro', 'numero', 'bairro', 'cidade'].some((k) => String(draft[k] || '').trim());
  }
  return false;
}
