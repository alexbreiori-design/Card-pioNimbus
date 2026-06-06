import { NextResponse } from 'next/server';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';
import { countActivityStatuses, enrichStoresForList } from '@/lib/superAdmin/storeMetrics';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

async function listClientStores(supabase) {
  let empresas = [];
  let error = null;

  ({ data: empresas, error } = await supabase
    .from('empresas')
    .select('id, slug, nome, aberta, endereco_cidade, segmento, created_at, logo_url, suspensa')
    .order('created_at', { ascending: false }));

  if (error?.message?.includes('suspensa')) {
    ({ data: empresas, error } = await supabase
      .from('empresas')
      .select('id, slug, nome, aberta, endereco_cidade, segmento, created_at, logo_url')
      .order('created_at', { ascending: false }));
    empresas = (empresas || []).map((row) => ({ ...row, suspensa: false }));
  }

  if (error) throw error;

  const clientStores = (empresas || []).filter((row) => !isModelStoreSlug(row.slug));
  const withMembers = clientStores.map((row) => ({ ...row, memberCount: 0 }));

  if (withMembers.length) {
    const ids = withMembers.map((row) => row.id);
    const { data: membros, error: membrosError } = await supabase
      .from('empresa_membros')
      .select('empresa_id')
      .in('empresa_id', ids)
      .eq('ativo', true);
    if (membrosError) throw membrosError;
    const countMap = new Map();
    (membros || []).forEach((row) => {
      countMap.set(row.empresa_id, (countMap.get(row.empresa_id) || 0) + 1);
    });
    withMembers.forEach((row) => {
      row.memberCount = countMap.get(row.id) || 0;
    });
  }

  return enrichStoresForList(supabase, withMembers);
}

export async function GET() {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireSuperAdmin();
    const stores = await listClientStores(supabase);
    const counts = countActivityStatuses(stores);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const criadasNoMes = stores.filter(
      (row) => row.created_at && new Date(row.created_at) >= monthStart
    ).length;
    const suspensas = stores.filter((row) => row.suspensa).length;

    let health = { ok: false };
    try {
      const { data, error } = await supabase.rpc('health_ping');
      health = { ok: !error && data === true };
    } catch {
      health = { ok: false };
    }

    const alertas = stores
      .filter((row) => row.activityStatus === 'sem_pedido_recente')
      .slice(0, 8)
      .map((row) => ({
        slug: row.slug,
        nome: row.nome,
        tipo: 'sem_pedido_recente',
      }));

    const recentes = stores.slice(0, 5).map((row) => ({
      slug: row.slug,
      nome: row.nome,
      cidade: row.endereco_cidade,
      created_at: row.created_at,
    }));

    return NextResponse.json({
      ok: true,
      counts: {
        ...counts,
        criadasNoMes,
        suspensas,
      },
      health,
      alertas,
      recentes,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar início.' },
      { status }
    );
  }
}
