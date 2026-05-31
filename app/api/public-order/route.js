import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

export async function POST(request) {
  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY ausente. Pedido salvo apenas no estado local.' },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().toLowerCase();
  const order = body.order;
  const customer = body.customer;
  if (!slug || !order || !customer) {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (empresaError) throw empresaError;
  if (!empresa?.id) {
    return NextResponse.json({ ok: false, error: 'Empresa não encontrada.' }, { status: 404 });
  }

  const phone = normalizePhone(customer.phone || order.clienteTelefone);
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .upsert(
      {
        empresa_id: empresa.id,
        nome: customer.name || order.clienteNome,
        telefone: phone,
        total_pedidos: customer.total_orders || 1,
        total_gasto: customer.total_spent || order.total || 0,
        ultimo_pedido_em: customer.last_order_at || order.createdAt,
        updated_at: new Date().toISOString(),
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

  const { data: pedido, error: pedidoError } = await supabase
    .from('pedidos')
    .insert({
      empresa_id: empresa.id,
      cliente_id: cliente.id,
      codigo: String(order.id),
      status: order.status || 'novo',
      tipo: order.tipo || 'delivery',
      origem: 'cardapio_online',
      cliente_nome: order.clienteNome,
      cliente_telefone: phone,
      endereco_texto: order.enderecoTexto || null,
      subtotal: order.subtotal || 0,
      taxa_entrega: order.frete || 0,
      acrescimo: order.acrescimo || 0,
      desconto: order.desconto || 0,
      total: order.total || 0,
      forma_pagamento_codigo: order.pagamento?.metodo || null,
      cupom_codigo: order.cupomCodigo || null,
      observacao: order.observacao || null,
      entregar_ate: order.entregarAte || null,
      status_novo_em: order.createdAt || new Date().toISOString(),
      created_at: order.createdAt || new Date().toISOString(),
    })
    .select('id')
    .single();
  if (pedidoError) throw pedidoError;

  const items = (order.itens || []).map((item) => ({
    pedido_id: pedido.id,
    empresa_id: empresa.id,
    produto_id: item.produtoId || null,
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

  return NextResponse.json({ ok: true, pedidoId: pedido.id, clienteId: cliente.id });
}
