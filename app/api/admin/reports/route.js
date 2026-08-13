import { NextResponse } from 'next/server';
import { buildStoreReport } from '@/lib/admin/reports/buildStoreReport';
import {
  isValidDateKey,
  normalizeReportPeriodDays,
} from '@/lib/admin/reports/reportPeriod';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');
  const periodRaw = url.searchParams.get('period') ?? '0';
  const period = normalizeReportPeriodDays(periodRaw);
  const from = String(url.searchParams.get('from') || '').trim();
  const to = String(url.searchParams.get('to') || '').trim();
  const origem = String(url.searchParams.get('origem') || 'all');
  const tipo = String(url.searchParams.get('tipo') || 'all');
  const pagamento = String(url.searchParams.get('pagamento') || 'all');

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  if (period === 'custom') {
    if (!isValidDateKey(from) || !isValidDateKey(to)) {
      return NextResponse.json(
        { ok: false, error: 'Informe from e to no formato AAAA-MM-DD para período personalizado.' },
        { status: 400 }
      );
    }
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
        'id, codigo, status, tipo, origem, subtotal, taxa_entrega, desconto, total, forma_pagamento_codigo, cupom_codigo, created_at, status_concluido_em, entregador_id, cliente_nome, endereco_texto'
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
        .select('pedido_id, produto_id, nome, quantidade, preco_unitario, preco_total')
        .eq('empresa_id', empresa.id)
        .in('pedido_id', pedidoIds);
      if (itensError) throw itensError;
      itemRows = itens || [];

      const produtoIds = [
        ...new Set(itemRows.map((item) => item.produto_id).filter(Boolean)),
      ];
      const imageById = {};
      if (produtoIds.length) {
        const { data: produtos, error: produtosError } = await supabase
          .from('produtos')
          .select('id, imagem_url')
          .eq('empresa_id', empresa.id)
          .in('id', produtoIds);
        if (!produtosError) {
          (produtos || []).forEach((row) => {
            imageById[row.id] = row.imagem_url || null;
          });
        }
      }

      const imageByName = {};
      const rememberName = (nome, url) => {
        const key = String(nome || '')
          .trim()
          .toLowerCase();
        if (key && url && !imageByName[key]) imageByName[key] = url;
      };

      const [namedProdutosRes, pizzaSaboresRes, marmitasRes] = await Promise.all([
        supabase
          .from('produtos')
          .select('nome, imagem_url')
          .eq('empresa_id', empresa.id)
          .neq('imagem_url', ''),
        supabase
          .from('store_pizza_sabores')
          .select('nome, imagem_url')
          .eq('empresa_id', empresa.id)
          .neq('imagem_url', ''),
        supabase
          .from('store_marmitas')
          .select('nome_publico, imagem_url')
          .eq('empresa_id', empresa.id)
          .neq('imagem_url', ''),
      ]);

      (namedProdutosRes.data || []).forEach((row) => rememberName(row.nome, row.imagem_url));
      (pizzaSaboresRes.data || []).forEach((row) => rememberName(row.nome, row.imagem_url));
      (marmitasRes.data || []).forEach((row) => rememberName(row.nome_publico, row.imagem_url));

      itemRows = itemRows.map((item) => {
        const byId = item.produto_id ? imageById[item.produto_id] || null : null;
        const byName =
          imageByName[
            String(item.nome || '')
              .trim()
              .toLowerCase()
          ] || null;
        return {
          ...item,
          imagemUrl: byId || byName || null,
        };
      });
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

    const report = buildStoreReport({
      pedidos: pedidoRows,
      itens: itemRows,
      periodDays: period,
      customFrom: period === 'custom' ? from : null,
      customTo: period === 'custom' ? to : null,
      filters: { origem, tipo, pagamento },
      entregadorNames,
    });

    return NextResponse.json({
      ok: true,
      slug,
      report,
    });
  } catch (error) {
    const status = error?.status || (error?.message?.includes('período') ? 400 : 500);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar relatório.' },
      { status }
    );
  }
}
