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

export async function GET(request) {
  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const slug = String(searchParams.get('slug') || '').trim().toLowerCase();
  const phone = normalizePhone(searchParams.get('phone'));

  if (!slug || !phone) {
    return NextResponse.json({ ok: false, error: 'Slug e telefone são obrigatórios.' }, { status: 400 });
  }

  try {
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: true, orders: [] });
    }

    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select(
        'id, codigo, status, tipo, created_at, entregar_ate, cliente_nome, cliente_telefone, endereco_texto, subtotal, taxa_entrega, desconto, total, forma_pagamento_codigo, cupom_codigo'
      )
      .eq('empresa_id', empresa.id)
      .eq('cliente_telefone', phone)
      .order('created_at', { ascending: false })
      .limit(50);
    if (pedidosError) throw pedidosError;

    if (!pedidos?.length) {
      return NextResponse.json({ ok: true, orders: [] });
    }

    const pedidoIds = pedidos.map((row) => row.id);
    const { data: itens, error: itensError } = await supabase
      .from('pedido_itens')
      .select('pedido_id, produto_id, nome, quantidade, preco_unitario, preco_total, observacao')
      .in('pedido_id', pedidoIds);
    if (itensError) throw itensError;

    const itensByPedido = new Map();
    (itens || []).forEach((item) => {
      if (!itensByPedido.has(item.pedido_id)) itensByPedido.set(item.pedido_id, []);
      itensByPedido.get(item.pedido_id).push(item);
    });

    const orders = pedidos.map((row) => ({
      ...row,
      itens: itensByPedido.get(row.id) || [],
    }));

    return NextResponse.json({ ok: true, orders });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar pedidos.' },
      { status: 500 }
    );
  }
}
