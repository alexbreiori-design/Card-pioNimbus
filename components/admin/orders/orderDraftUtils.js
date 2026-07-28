export const ORDER_TYPES = [
  { value: 'delivery', label: 'Delivery' },
  { value: 'retirada', label: 'Retirada' },
  { value: 'balcao', label: 'Balcão' },
];

export const PAYMENT_METHODS = [
  {
    value: 'credito',
    label: 'Crédito',
    color: '#f75c00',
    hgiIcon: 'hgi-credit-card-add',
  },
  {
    value: 'dinheiro',
    label: 'Dinheiro',
    color: '#3aaa34',
    hgiIcon: 'hgi-money-03',
  },
  {
    value: 'debito',
    label: 'Débito',
    color: '#820ad1',
    hgiIcon: 'hgi-credit-card-accept',
  },
  {
    value: 'pix',
    label: 'Pix',
    color: '#00bdae',
    adminIcon: 'pix',
  },
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
  acrescimoTipo: '$',
  desconto: '',
  descontoTipo: '$',
  cupomId: '',
  cupomCodigo: '',
  cupomDesconto: 0,
  taxaEntrega: '0',
  distanciaKm: null,
  enderecoLatitude: null,
  enderecoLongitude: null,
  formaPagamento: '',
  trocoAnswer: '',
  trocoValue: '',
  cart: [],
};

export function createOrderDraftLineId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

export function fmtPhone(v) {
  const n = String(v || '').replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
}

/** sessionStorage: draft de novo pedido vindo da tela Clientes. */
export const PENDING_NEW_ORDER_DRAFT_KEY = 'nimbus:pending-new-order-draft';

/**
 * Monta draft do modal a partir de um cliente + endereços (principal preferido).
 * @param {{ name?: string, phone?: string }} customer
 * @param {Array<Record<string, unknown>>} [addresses]
 */
export function buildOrderDraftFromCustomer(customer, addresses = []) {
  const list = Array.isArray(addresses) ? addresses : [];
  const principal = list.find((a) => a.principal) || list[0] || null;
  return {
    ...EMPTY_ORDER_DRAFT,
    tipo: 'delivery',
    telefone: fmtPhone(customer?.phone || ''),
    clienteNome: String(customer?.name || '').trim(),
    cep: principal?.cep || '',
    logradouro: principal?.street || '',
    numero: principal?.number || '',
    bairro: principal?.district || '',
    cidade: principal?.city || '',
    estado: principal?.state || '',
    complemento: principal?.complement || '',
  };
}

/** Limpa nome, telefone e endereço do draft; mantém carrinho, pagamento e demais campos. */
export function clearOrderDraftNameAndAddress(draft) {
  return {
    ...draft,
    clienteNome: '',
    telefone: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
    distanciaKm: null,
    enderecoLatitude: null,
    enderecoLongitude: null,
  };
}

export function stashPendingNewOrderDraft(draft) {
  if (typeof window === 'undefined' || !draft) return;
  try {
    sessionStorage.setItem(PENDING_NEW_ORDER_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

export function peekPendingNewOrderDraft() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(PENDING_NEW_ORDER_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingNewOrderDraft() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(PENDING_NEW_ORDER_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

export function currency(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

export function formatDistanceKm(value) {
  if (value === null || value === undefined || value === '') return '';
  const distance = Number(value);
  if (!Number.isFinite(distance) || distance < 0) return '';
  return `${distance.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km`;
}

export function parseMoneyInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  if (/R\$/i.test(raw)) {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return 0;
    const amount = Number(digits) / 100;
    return Number.isFinite(amount) ? amount : 0;
  }
  const parsed = Number(raw.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveTypedAmount(rawValue, tipo, baseSubtotal) {
  const amount = parseMoneyInput(rawValue);
  if (amount <= 0) return 0;
  if (tipo === '%') return (baseSubtotal * amount) / 100;
  return amount;
}

export function computeOrderTotals(draft) {
  const subtotal = (draft.cart || []).reduce(
    (s, i) => s + Number(i.preco || 0) * Number(i.qtd || 1),
    0
  );
  const entrega = draft.tipo === 'delivery' ? parseMoneyInput(draft.taxaEntrega) : 0;
  const acrescimo = resolveTypedAmount(draft.acrescimo, draft.acrescimoTipo || '$', subtotal);
  const descontoManual = resolveTypedAmount(draft.desconto, draft.descontoTipo || '$', subtotal);
  const descontoCupom = Number(draft.cupomDesconto) || 0;
  const desconto = descontoManual + descontoCupom;
  const total = Math.max(0, subtotal + entrega + acrescimo - desconto);
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

export function hasDeliveryAddress(draft) {
  return (
    Boolean(String(draft?.logradouro || '').trim()) &&
    Boolean(String(draft?.numero || '').trim())
  );
}

export function formatAddressSummary(draft) {
  if (!draft) return '';
  const line1 = [draft.logradouro, draft.numero].filter(Boolean).join(', ');
  const line2 = [draft.bairro, draft.cidade, draft.estado].filter(Boolean).join(' · ');
  const line3 = [draft.cep ? `CEP ${draft.cep}` : '', draft.complemento].filter(Boolean).join(' · ');
  return [line1, line2, line3].filter(Boolean).join('\n');
}

export function formatAdjustmentsSummary(draft) {
  if (!draft) return '';
  const parts = [];
  const descontoVal = parseMoneyInput(draft.desconto);
  if (descontoVal > 0) {
    parts.push(
      draft.descontoTipo === '%'
        ? `Desconto ${String(draft.desconto).trim()}%`
        : `Desconto ${currency(descontoVal)}`
    );
  }
  const acrescimoVal = parseMoneyInput(draft.acrescimo);
  if (acrescimoVal > 0) {
    parts.push(
      draft.acrescimoTipo === '%'
        ? `Acréscimo ${String(draft.acrescimo).trim()}%`
        : `Acréscimo ${currency(acrescimoVal)}`
    );
  }
  if (draft.cupomId) {
    parts.push(`Cupom ${draft.cupomCodigo || ''}`.trim());
  }
  return parts.join(' · ');
}

export function isOrderDraftValid(draft) {
  if (!String(draft.clienteNome || '').trim()) return false;
  if (!String(draft.telefone || '').replace(/\D/g, '')) return false;
  if (!(draft.cart || []).length) return false;
  if (draft.tipo === 'delivery') {
    if (!String(draft.logradouro || '').trim()) return false;
    if (!String(draft.numero || '').trim()) return false;
  }
  if (!String(draft.formaPagamento || '').trim()) return false;
  if (draft.formaPagamento === 'dinheiro') {
    if (!draft.trocoAnswer) return false;
    if (draft.trocoAnswer === 'sim' && parseMoneyInput(draft.trocoValue) <= 0) return false;
  }
  return true;
}

export function resolveDraftTroco(draft) {
  if (draft?.formaPagamento !== 'dinheiro' || draft?.trocoAnswer !== 'sim') return 0;
  return parseMoneyInput(draft.trocoValue);
}

export function hasDraftContent(draft) {
  if ((draft.cart || []).length) return true;
  if (String(draft.clienteNome || '').trim()) return true;
  if (String(draft.telefone || '').replace(/\D/g, '')) return true;
  if (String(draft.observacao || '').trim()) return true;
  if (parseMoneyInput(draft.acrescimo) > 0) return true;
  if (parseMoneyInput(draft.desconto) > 0) return true;
  if (draft.cupomId) return true;
  if (String(draft.formaPagamento || '').trim()) return true;
  if (draft.tipo === 'delivery') {
    return ['cep', 'logradouro', 'numero', 'bairro', 'cidade'].some((k) =>
      String(draft[k] || '').trim()
    );
  }
  return false;
}
