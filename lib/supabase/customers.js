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

export async function listClientes(empresaId) {
  const supabase = createClient();
  const eid = await requireEmpresaId(empresaId);
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('empresa_id', eid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapCliente);
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
  const { error } = await supabase.from('clientes').delete().eq('id', id).eq('empresa_id', eid);
  if (error) throw error;
}
