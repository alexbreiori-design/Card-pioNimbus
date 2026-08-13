import { createClient } from './client';
import { resolveEmpresaId } from './empresa';

export function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export function mapCliente(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.nome,
    phone: row.telefone,
    total_orders: row.total_pedidos ?? 0,
    total_spent: Number(row.total_gasto ?? 0),
    saldo_fiado: Number(row.saldo_fiado ?? 0),
    last_order_at: row.ultimo_pedido_em,
    empresa_id: row.empresa_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapEndereco(row) {
  if (!row) return null;
  return {
    id: row.id,
    cliente_id: row.cliente_id,
    cep: row.cep || '',
    street: row.rua || '',
    number: row.numero || '',
    district: row.bairro || '',
    city: row.cidade || '',
    state: row.estado || '',
    complement: row.complemento || '',
    referencia: row.referencia || '',
    principal: Boolean(row.principal),
  };
}

export function enderecoToRow(patch, { clienteId, empresaId }) {
  return {
    cliente_id: clienteId,
    empresa_id: empresaId,
    cep: patch.cep || null,
    rua: patch.street || patch.rua || '-',
    numero: patch.number || patch.numero || null,
    bairro: patch.district || patch.bairro || '-',
    cidade: patch.city || patch.cidade || '-',
    estado: patch.state || patch.estado || '-',
    complemento: patch.complement || patch.complemento || null,
    referencia: patch.referencia || null,
    principal: Boolean(patch.principal),
  };
}

const PEDIDO_STATUS_LABEL = {
  novo: 'Novo',
  em_preparo: 'Em preparo',
  saiu_entrega: 'Saiu para entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export function mapPedidoResumo(row) {
  return {
    id: row.codigo || row.id,
    rawId: row.id,
    total: Number(row.total ?? 0),
    status: row.status,
    statusLabel: PEDIDO_STATUS_LABEL[row.status] || row.status,
    created_at: row.created_at,
  };
}

async function requireEmpresaId(empresaId) {
  const id = empresaId || (await resolveEmpresaId());
  if (!id) throw new Error('Empresa não identificada. Verifique o slug em Minha loja e o cadastro no Supabase.');
  return id;
}

export async function findCustomerByPhone(phone, empresaId) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', eid)
    .eq('telefone', normalized)
    .maybeSingle();
  if (error) throw error;
  return mapCliente(data);
}

/** Busca clientes por nome (ilike). Retorna até `limit` resultados ordenados por nome. */
export async function searchCustomersByName(nameQuery, empresaId, { limit = 8 } = {}) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const q = String(nameQuery || '').trim();
  if (q.length < 2) return [];

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', eid)
    .ilike('nome', `%${q}%`)
    .order('nome', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(mapCliente);
}

export async function createCustomer({ name, phone, address, empresaId }) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const nome = String(name || '').trim();
  const telefone = normalizePhone(phone);
  if (!nome || !telefone) throw new Error('Nome e telefone são obrigatórios.');

  const { data: cliente, error } = await supabase
    .from('clientes')
    .insert({ empresa_id: eid, nome, telefone })
    .select('*')
    .single();
  if (error) throw error;

  const hasAddress =
    address &&
    (address.cep ||
      address.street ||
      address.logradouro ||
      address.number ||
      address.city);

  if (hasAddress) {
    const row = enderecoToRow(
      {
        cep: address.cep,
        street: address.street || address.logradouro,
        number: address.number || address.numero,
        district: address.district || address.bairro,
        city: address.city || address.cidade,
        state: address.state || address.estado,
        complement: address.complement || address.complemento,
        principal: true,
      },
      { clienteId: cliente.id, empresaId: eid }
    );
    const { error: addrError } = await supabase.from('cliente_enderecos').insert(row);
    if (addrError) throw addrError;
  }

  return mapCliente(cliente);
}

export async function ensureCustomer({ name, phone, empresaId }) {
  const existing = await findCustomerByPhone(phone, empresaId);
  if (existing) return existing;
  return createCustomer({ name, phone, empresaId });
}

export async function updateCustomerStats({ customerId, orderValue, empresaId }) {
  if (!customerId) return;
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);

  const { data: current, error: readError } = await supabase
    .from('clientes')
    .select('total_pedidos, total_gasto')
    .eq('id', customerId)
    .eq('empresa_id', eid)
    .maybeSingle();
  if (readError) throw readError;

  const nextOrders = Number(current?.total_pedidos || 0) + 1;
  const nextSpent = Number(current?.total_gasto || 0) + Number(orderValue || 0);

  const { error } = await supabase
    .from('clientes')
    .update({
      total_pedidos: nextOrders,
      total_gasto: nextSpent,
      ultimo_pedido_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .eq('empresa_id', eid);
  if (error) throw error;
}

async function fetchAllPages(buildQuery, { pageSize = 1000 } = {}) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const INACTIVE_MS = 60 * 24 * 60 * 60 * 1000;

function applyClientesStatusFilter(query, status) {
  const cutoffIso = new Date(Date.now() - INACTIVE_MS).toISOString();
  const cutoff = `"${cutoffIso}"`;
  switch (status) {
    case 'com_saldo':
      return query.gt('saldo_fiado', 0);
    case 'inativo':
      return query.or(`ultimo_pedido_em.is.null,ultimo_pedido_em.lt.${cutoff}`);
    case 'recorrente':
      return query.gte('total_pedidos', 3).gte('ultimo_pedido_em', cutoffIso);
    case 'novo':
      return query.lte('total_pedidos', 1).gte('ultimo_pedido_em', cutoffIso);
    default:
      return query;
  }
}

function sanitizeSearchTerm(value) {
  return String(value || '')
    .trim()
    .replace(/[%_,.()]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

/** Lista paginada de clientes (ordenada por nome). */
export async function listClientesPage(
  empresaId,
  { page = 0, pageSize = 25, search = '', status = 'todos' } = {}
) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const safePage = Math.max(0, Number(page) || 0);
  const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
  const from = safePage * safeSize;
  const to = from + safeSize - 1;

  let query = supabase
    .from('clientes')
    .select('*', { count: 'exact' })
    .eq('empresa_id', eid);

  query = applyClientesStatusFilter(query, status);

  const term = sanitizeSearchTerm(search);
  if (term) {
    const digits = term.replace(/\D/g, '');
    if (digits) {
      query = query.or(`nome.ilike.%${term}%,telefone.ilike.%${digits}%`);
    } else {
      query = query.ilike('nome', `%${term}%`);
    }
  }

  const { data, error, count } = await query
    .order('nome', { ascending: true })
    .range(from, to);
  if (error) throw error;

  return {
    clientes: (data || []).map(mapCliente),
    total: count ?? 0,
    page: safePage,
    pageSize: safeSize,
  };
}

export async function listClientes(empresaId) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const rows = await fetchAllPages(() =>
    supabase.from('clientes').select('*').eq('empresa_id', eid).order('nome', { ascending: true })
  );
  return rows.map(mapCliente);
}

export async function listClienteEnderecos(clienteId, empresaId) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const { data, error } = await supabase
    .from('cliente_enderecos')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('empresa_id', eid)
    .order('principal', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapEndereco);
}

export async function listPedidosByCliente(clienteId, empresaId) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, codigo, cliente_id, created_at, total, status')
    .eq('empresa_id', eid)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPedidoResumo);
}

/** Carrega clientes + endereços + pedidos em queries por empresa (evita .in() gigante). */
export async function listClientesWithDetails(empresaId) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const clientes = await listClientes(eid);
  if (!clientes.length) {
    return { clientes: [], enderecosByCliente: {}, pedidosByCliente: {} };
  }

  const clienteIds = new Set(clientes.map((c) => c.id));

  const [enderecosRows, pedidosRows] = await Promise.all([
    fetchAllPages(() =>
      supabase
        .from('cliente_enderecos')
        .select('*')
        .eq('empresa_id', eid)
        .order('principal', { ascending: false })
        .order('created_at', { ascending: false })
    ),
    fetchAllPages(() =>
      supabase
        .from('pedidos')
        .select('id, codigo, cliente_id, created_at, total, status')
        .eq('empresa_id', eid)
        .not('cliente_id', 'is', null)
        .order('created_at', { ascending: false })
    ),
  ]);

  const enderecosByCliente = {};
  enderecosRows.forEach((row) => {
    if (!clienteIds.has(row.cliente_id)) return;
    const mapped = mapEndereco(row);
    if (!enderecosByCliente[row.cliente_id]) enderecosByCliente[row.cliente_id] = [];
    enderecosByCliente[row.cliente_id].push(mapped);
  });

  const pedidosByCliente = {};
  pedidosRows.forEach((row) => {
    if (!clienteIds.has(row.cliente_id)) return;
    const mapped = mapPedidoResumo(row);
    if (!pedidosByCliente[row.cliente_id]) pedidosByCliente[row.cliente_id] = [];
    pedidosByCliente[row.cliente_id].push(mapped);
  });

  return { clientes, enderecosByCliente, pedidosByCliente };
}

export async function upsertClienteEndereco({ id, clienteId, empresaId, patch }) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const row = enderecoToRow(patch, { clienteId, empresaId: eid });

  if (id) {
    const { error } = await supabase.from('cliente_enderecos').update(row).eq('id', id).eq('empresa_id', eid);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('cliente_enderecos').insert(row);
  if (error) throw error;
}

export async function deleteClienteEndereco(id, empresaId) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const { error } = await supabase.from('cliente_enderecos').delete().eq('id', id).eq('empresa_id', eid);
  if (error) throw error;
}

export async function updateCliente({ id, name, phone, empresaId }) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const { error } = await supabase
    .from('clientes')
    .update({
      nome: String(name || '').trim(),
      telefone: normalizePhone(phone),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('empresa_id', eid);
  if (error) throw error;
}

export async function deleteCliente(id, empresaId) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const { data, error } = await supabase
    .from('clientes')
    .delete()
    .eq('id', id)
    .eq('empresa_id', eid)
    .select('id');
  if (error) throw error;
  if (!data?.length) {
    throw new Error('Cliente não encontrado ou sem permissão para excluir.');
  }
}
