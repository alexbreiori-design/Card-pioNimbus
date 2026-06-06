import { NextResponse } from 'next/server';
import { buildStoreRanking } from '@/lib/superAdmin/metricsCompare';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const days = Number(new URL(request.url).searchParams.get('days') || 30);

  try {
    await requireSuperAdmin();

    const { data: empresas, error } = await supabase
      .from('empresas')
      .select('id, slug, nome, endereco_cidade, segmento')
      .order('nome', { ascending: true });
    if (error) throw error;

    const clientStores = (empresas || []).filter((row) => !isModelStoreSlug(row.slug));
    const empresaIds = clientStores.map((row) => row.id);

    let pedidos = [];
    if (empresaIds.length) {
      const { data, error: pedidosError } = await supabase
        .from('pedidos')
        .select('empresa_id, total, created_at')
        .in('empresa_id', empresaIds)
        .eq('origem', 'cardapio_online')
        .neq('status', 'cancelado');
      if (pedidosError) throw pedidosError;
      pedidos = data || [];
    }

    const ranking = buildStoreRanking(clientStores, pedidos, days);

    return NextResponse.json({
      ok: true,
      days: Math.max(7, Math.min(365, Number(days) || 30)),
      ranking,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar ranking.' },
      { status }
    );
  }
}
