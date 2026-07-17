import { toDbUuidOrNull } from '@/lib/dbIds';
import { normalizePhone } from '@/lib/normalize';
import { withDerivedData } from '@/lib/adminData';
import { validatePublicOrder } from '@/lib/orderValidation';
import { loadAssembledStoreState } from '@/lib/catalog/storeCatalogRepository';
import { getActiveTurno } from '@/lib/caixa/caixaServer';
import { resolveStoreOpenStatus } from '@/lib/storeHours';
import { listZonasByEmpresaId } from '@/lib/supabase/empresaServer';

export async function preparePublicOrder({ supabase, slug, order, customer }) {
  const safeSlug = String(slug || '').trim().toLowerCase();
  if (!safeSlug || !order || !customer) {
    const error = new Error('Payload inválido.');
    error.status = 400;
    throw error;
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .select('id, slug, aberta, suspensa')
    .eq('slug', safeSlug)
    .maybeSingle();
  if (empresaError) throw empresaError;
  if (!empresa?.id) {
    const error = new Error('Empresa não encontrada.');
    error.status = 404;
    throw error;
  }
  if (empresa.suspensa === true) {
    const error = new Error('Loja indisponível no momento.');
    error.status = 403;
    throw error;
  }

  const loaded = await loadAssembledStoreState(supabase, safeSlug);
  const storeData = withDerivedData(loaded?.data || {});
  const { aberta } = resolveStoreOpenStatus(storeData.loja);
  if (!aberta) {
    const error = new Error('Loja fechada no momento.');
    error.status = 403;
    throw error;
  }

  const zonas = await listZonasByEmpresaId(supabase, empresa.id);
  const validated = validatePublicOrder({ order, storeData, zonas, empresa });
  const phone = normalizePhone(customer.phone || order.clienteTelefone);
  if (!phone || phone.length < 11) {
    const error = new Error('Telefone inválido.');
    error.status = 400;
    throw error;
  }

  return { slug: safeSlug, empresa, order, customer, validated, phone };
}

export async function persistPreparedPublicOrder({
  supabase,
  prepared,
  payment = null,
}) {
  const { empresa, order, customer, validated, phone } = prepared;
  const now = new Date().toISOString();

  const { data: existingCliente } = await supabase
    .from('clientes')
    .select('id, total_pedidos, total_gasto')
    .eq('empresa_id', empresa.id)
    .eq('telefone', phone)
    .maybeSingle();

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .upsert(
      {
        empresa_id: empresa.id,
        nome: String(customer.name || order.clienteNome || '').trim() || 'Cliente',
        telefone: phone,
        total_pedidos: Number(existingCliente?.total_pedidos || 0) + 1,
        total_gasto: Number(existingCliente?.total_gasto || 0) + validated.total,
        ultimo_pedido_em: order.createdAt || now,
        updated_at: now,
      },
      { onConflict: 'empresa_id,telefone' }
    )
    .select('*')
    .single();
  if (clienteError) throw clienteError;

  const address = order.endereco;
  if (address) {
    await supabase
      .from('cliente_enderecos')
      .delete()
      .eq('cliente_id', cliente.id)
      .eq('empresa_id', empresa.id)
      .eq('principal', true);

    const { error: addrError } = await supabase.from('cliente_enderecos').insert({
      cliente_id: cliente.id,
      empresa_id: empresa.id,
      cep: address.cep || null,
      rua: address.logradouro || '-',
      numero: address.numero || null,
      bairro: address.bairro || '-',
      cidade: address.cidade || '-',
      estado: address.estado || '-',
      complemento: address.complemento || null,
      referencia: address.referencia || null,
      principal: true,
    });
    if (addrError) throw addrError;
  }

  const activeTurno = await getActiveTurno(supabase, empresa.id);
  const isOnline = Boolean(payment?.id);
  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      empresa_id: empresa.id,
      cliente_id: cliente.id,
      status: order.status || 'novo',
      tipo: validated.tipo === 'delivery' ? 'delivery' : 'retirada',
      origem: 'cardapio_online',
      cliente_nome: order.clienteNome,
      cliente_telefone: phone,
      endereco_texto: order.enderecoTexto || null,
      endereco_latitude: order.enderecoLatitude != null ? Number(order.enderecoLatitude) : null,
      endereco_longitude: order.enderecoLongitude != null ? Number(order.enderecoLongitude) : null,
      distancia_km: order.distanciaKm != null ? Number(order.distanciaKm) : null,
      subtotal: validated.subtotal,
      taxa_entrega: validated.frete,
      acrescimo: 0,
      desconto: validated.desconto,
      total: validated.total,
      forma_pagamento_codigo: isOnline
        ? payment.metodo === 'pix'
          ? 'pix_online'
          : 'credito_online'
        : order.pagamento?.metodo || null,
      cupom_codigo: order.cupomCodigo || null,
      observacao: order.observacao || null,
      entregar_ate: order.entregarAte || null,
      status_novo_em: order.createdAt || now,
      created_at: order.createdAt || now,
      caixa_turno_id: activeTurno?.id || null,
      aguardando_caixa: !activeTurno,
      pagamento_online: isOnline,
      pagamento_status: isOnline ? 'aprovado' : 'nao_aplicavel',
      pagamento_id: payment?.id || null,
    })
    .select('id, codigo')
    .single();
  if (pedidoError) throw pedidoError;

  const items = (order.itens || []).map((item) => ({
    pedido_id: pedido.id,
    empresa_id: empresa.id,
    produto_id: toDbUuidOrNull(item.produtoId),
    nome: item.nome,
    quantidade: item.qtd || 1,
    preco_unitario: item.precoUnit || 0,
    preco_total: item.subtotal || 0,
    observacao: item.obs || null,
  }));
  if (items.length) {
    const { error: itemsError } = await supabase.from('pedido_itens').insert(items);
    if (itemsError) throw itemsError;
  }

  return { pedido, cliente };
}
