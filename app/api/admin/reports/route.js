import { NextResponse } from 'next/server';
import { buildStoreReport } from '@/lib/admin/reports/buildStoreReport';
import { normalizeReportPeriodDays } from '@/lib/admin/reports/reportPeriod';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');
  const period = Number(url.searchParams.get('period') || 7);
  const origem = String(url.searchParams.get('origem') || 'all');
  const tipo = String(url.searchParams.get('tipo') || 'all');
  const pagamento = String(url.searchParams.get('pagamento') || 'all');

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireStoreAdmin(slug);

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const { data: pedidos, error: pedidosError } = await supabase
      .from('pedidos')
      .select(
        'id, status, tipo, origem, subtotal, taxa_entrega, desconto, total, forma_pagamento_codigo, cupom_codigo, created_at, status_concluido_em, entregador_id'
      )
      .eq('empresa_id', empresa.id)
      .eq('status', 'concluido')
      .order('created_at', { ascending: false })
      .limit(3000);
    if (pedidosError) throw pedidosError;

    const pedidoRows = pedidos || [];
    const pedidoIds = pedidoRows.map((row) => row.id);
    const entregadorIds = [
      ...new Set(pedidoRows.map((row) => row.entregador_id).filter(Boolean)),
    ];
    let itemRows = [];
    const entregadorNames = {};

    if (pedidoIds.length) {
      const { data: itens, error: itensError } = await supabase
        .from('pedido_itens')
        .select('pedido_id, nome, quantidade, preco_unitario, preco_total')
        .eq('empresa_id', empresa.id)
        .in('pedido_id', pedidoIds);
      if (itensError) throw itensError;
      itemRows = itens || [];
    }

    if (entregadorIds.length) {
      const { data: drivers, error: driversError } = await supabase
        .from('entregadores')
        .select('id, nome')
        .eq('empresa_id', empresa.id)
        .in('id', entregadorIds);
      if (!driversError) {
        (drivers || []).forEach((item) => {
          entregadorNames[item.id] = item.nome;
        });
      }
    }

    const periodDays = normalizeReportPeriodDays(period);

    const report = buildStoreReport({
      pedidos: pedidoRows,
      itens: itemRows,
      periodDays,
      filters: { origem, tipo, pagamento },
      entregadorNames,
    });

    return NextResponse.json({
      ok: true,
      slug,
      report,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar relatório.' },
      { status }
    );
  }
}
