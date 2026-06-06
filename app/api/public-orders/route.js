import { NextResponse } from 'next/server';
import { checkPublicOrdersReadRateLimit } from '@/lib/rateLimit';
import { normalizePhone, normalizeSlug } from '@/lib/normalize';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const slug = normalizeSlug(searchParams.get('slug'));
  const phone = normalizePhone(searchParams.get('phone'));

  if (!slug || !phone) {
    return NextResponse.json({ ok: false, error: 'Slug e telefone são obrigatórios.' }, { status: 400 });
  }

  const rateLimit = checkPublicOrdersReadRateLimit(request, slug);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Muitas consultas. Aguarde um momento.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
      }
    );
  }

  try {
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: true, orders: [], latestUpdatedAt: null });
    }

    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select(
        'id, codigo, status, tipo, created_at, updated_at, entregar_ate, cliente_nome, cliente_telefone, endereco_texto, subtotal, taxa_entrega, desconto, total, forma_pagamento_codigo, cupom_codigo'
      )
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (pedidosError) throw pedidosError;

    const filteredPedidos = (pedidos || []).filter(
      (row) => normalizePhone(row.cliente_telefone) === phone
    );

    if (!filteredPedidos.length) {
      return NextResponse.json({ ok: true, orders: [], latestUpdatedAt: null });
    }

    const pedidoIds = filteredPedidos.map((row) => row.id);
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

    const orders = filteredPedidos.map((row) => ({
      ...row,
      itens: itensByPedido.get(row.id) || [],
    }));

    const latestUpdatedAt = filteredPedidos.reduce((max, row) => {
      const ts = row.updated_at || row.created_at;
      if (!ts) return max;
      if (!max || new Date(ts).getTime() > new Date(max).getTime()) return ts;
      return max;
    }, null);

    return NextResponse.json({ ok: true, orders, latestUpdatedAt });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar pedidos.' },
      { status: 500 }
    );
  }
}
