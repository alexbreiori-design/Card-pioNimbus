import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

const INACTIVE_MS = 60 * 24 * 60 * 60 * 1000;

function sanitizeSearchTerm(value) {
  return String(value || '')
    .trim()
    .replace(/[%_,.()]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

function mapCliente(row) {
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

function applyStatusFilter(query, status) {
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

export async function GET(request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');
  const page = Math.max(0, Number(url.searchParams.get('page') || 0) || 0);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || 25) || 25));
  const search = sanitizeSearchTerm(url.searchParams.get('search') || '');
  const status = String(url.searchParams.get('status') || 'todos');

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
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('clientes')
      .select(
        'id, empresa_id, nome, telefone, total_pedidos, total_gasto, saldo_fiado, ultimo_pedido_em, created_at, updated_at',
        { count: 'exact' }
      )
      .eq('empresa_id', empresa.id);

    query = applyStatusFilter(query, status);

    if (search) {
      const digits = search.replace(/\D/g, '');
      if (digits) {
        query = query.or(`nome.ilike.%${search}%,telefone.ilike.%${digits}%`);
      } else {
        query = query.ilike('nome', `%${search}%`);
      }
    }

    const { data, error, count } = await query.order('nome', { ascending: true }).range(from, to);
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      clientes: (data || []).map(mapCliente),
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    const statusCode = Number(error?.status) || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar clientes.' },
      { status: statusCode >= 400 && statusCode < 600 ? statusCode : 500 }
    );
  }
}
