import { NextResponse } from 'next/server';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';
import { countActivityStatuses, enrichStoresForList } from '@/lib/superAdmin/storeMetrics';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { mapAssinaturaRow } from '@/lib/stripe/assinaturas';

const ALERT_PRIORITY = {
  suspensa: 0,
  past_due: 1,
  carencia_vencendo: 2,
  sem_pedido_recente: 3,
  feedback: 4,
  sem_go_live: 5,
};

async function listClientStores(supabase) {
  let empresas = [];
  let error = null;

  ({ data: empresas, error } = await supabase
    .from('empresas')
    .select('id, slug, nome, aberta, endereco_cidade, segmento, created_at, logo_url, suspensa, data_go_live')
    .order('created_at', { ascending: false }));

  if (error?.message?.includes('suspensa') || error?.message?.includes('data_go_live')) {
    ({ data: empresas, error } = await supabase
      .from('empresas')
      .select('id, slug, nome, aberta, endereco_cidade, segmento, created_at, logo_url')
      .order('created_at', { ascending: false }));
    empresas = (empresas || []).map((row) => ({ ...row, suspensa: false, data_go_live: null }));
  }

  if (error) throw error;

  return (empresas || []).filter((row) => !isModelStoreSlug(row.slug));
}

async function loadMemberCounts(supabase, empresaIds) {
  const countMap = new Map();
  if (!empresaIds.length) return countMap;
  const { data: membros, error } = await supabase
    .from('empresa_membros')
    .select('empresa_id')
    .in('empresa_id', empresaIds)
    .eq('ativo', true);
  if (error) throw error;
  (membros || []).forEach((row) => {
    countMap.set(row.empresa_id, (countMap.get(row.empresa_id) || 0) + 1);
  });
  return countMap;
}

async function loadBillingSummary(supabase, empresaIds) {
  const empty = { byEmpresaId: new Map(), mrrCentavos: 0, pastDue: 0, trials: 0 };
  if (!empresaIds.length) return empty;
  try {
    const { data, error } = await supabase
      .from('empresa_assinaturas')
      .select('*')
      .in('empresa_id', empresaIds);
    if (error) throw error;

    const byEmpresaId = new Map();
    let mrrCentavos = 0;
    let pastDue = 0;
    let trials = 0;
    (data || []).forEach((row) => {
      const mapped = mapAssinaturaRow(row);
      byEmpresaId.set(row.empresa_id, mapped);
      if (mapped.statusLocal !== 'cortesia' && ['active', 'trialing'].includes(mapped.status)) {
        mrrCentavos += Number(mapped.valorCentavos || 0);
      }
      if (['past_due', 'unpaid'].includes(mapped.status)) pastDue += 1;
      if (mapped.status === 'trialing') trials += 1;
    });
    return { byEmpresaId, mrrCentavos, pastDue, trials };
  } catch (error) {
    console.warn('[super-admin/overview] billing indisponível:', error?.message || error);
    return empty;
  }
}

async function loadFeedbackAbertos(supabase) {
  try {
    const { count, error } = await supabase
      .from('nimbus_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aberto');
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.warn('[super-admin/overview] feedback indisponível:', error?.message || error);
    return 0;
  }
}

async function loadTopFeedbackStores(supabase) {
  try {
    const { data, error } = await supabase
      .from('nimbus_feedback')
      .select('created_at, empresas ( slug, nome )')
      .eq('status', 'aberto')
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    return data || [];
  } catch {
    return [];
  }
}

export async function GET() {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireSuperAdmin();

    const rawStores = await listClientStores(supabase);
    const empresaIds = rawStores.map((row) => row.id);

    const memberCountMap = await loadMemberCounts(supabase, empresaIds);
    const withMembers = rawStores.map((row) => ({
      ...row,
      memberCount: memberCountMap.get(row.id) || 0,
    }));

    const stores = await enrichStoresForList(supabase, withMembers);
    const activityById = new Map(stores.map((row) => [row.id, row.activityStatus]));
    const counts = countActivityStatuses(stores);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const criadasNoMes = rawStores.filter(
      (row) => row.created_at && new Date(row.created_at) >= monthStart
    ).length;
    const suspensas = rawStores.filter((row) => row.suspensa).length;

    const [billing, feedbackAbertos, topFeedbackStores] = await Promise.all([
      loadBillingSummary(supabase, empresaIds),
      loadFeedbackAbertos(supabase),
      loadTopFeedbackStores(supabase),
    ]);

    let health = { ok: false };
    try {
      const { data, error } = await supabase.rpc('health_ping');
      health = { ok: !error && data === true };
    } catch {
      health = { ok: false };
    }

    const alertas = [];
    rawStores.forEach((row) => {
      if (row.suspensa) {
        alertas.push({ slug: row.slug, nome: row.nome, tipo: 'suspensa', label: 'Suspensa' });
        return;
      }
      const assinatura = billing.byEmpresaId.get(row.id);
      if (assinatura && ['past_due', 'unpaid'].includes(assinatura.status)) {
        alertas.push({ slug: row.slug, nome: row.nome, tipo: 'past_due', label: 'Pagamento em atraso' });
      }
      if (assinatura?.statusLocal === 'cortesia' && assinatura.carenciaFim) {
        const fimMs = new Date(assinatura.carenciaFim).getTime();
        const daysLeft = Math.ceil((fimMs - Date.now()) / (24 * 60 * 60 * 1000));
        if (Number.isFinite(daysLeft) && daysLeft <= 7) {
          alertas.push({
            slug: row.slug,
            nome: row.nome,
            tipo: 'carencia_vencendo',
            label:
              daysLeft < 0
                ? 'Carência vencida'
                : daysLeft === 0
                  ? 'Carência termina hoje'
                  : `Carência termina em ${daysLeft}d`,
          });
        }
      }
      if (activityById.get(row.id) === 'sem_pedido_recente') {
        alertas.push({
          slug: row.slug,
          nome: row.nome,
          tipo: 'sem_pedido_recente',
          label: 'Sem pedido recente',
        });
      }
      if (!row.data_go_live) {
        alertas.push({ slug: row.slug, nome: row.nome, tipo: 'sem_go_live', label: 'Sem data de go-live' });
      }
    });
    topFeedbackStores.forEach((row) => {
      if (row.empresas?.slug) {
        alertas.push({
          slug: row.empresas.slug,
          nome: row.empresas.nome || row.empresas.slug,
          tipo: 'feedback',
          label: 'Mensagem aberta no inbox',
        });
      }
    });

    alertas.sort((a, b) => (ALERT_PRIORITY[a.tipo] ?? 9) - (ALERT_PRIORITY[b.tipo] ?? 9));

    const recentes = rawStores.slice(0, 5).map((row) => ({
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
      alertas: alertas.slice(0, 20),
      recentes,
      billing: {
        mrrCentavos: billing.mrrCentavos,
        pastDue: billing.pastDue,
        trials: billing.trials,
      },
      feedbackAbertos,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar início.' },
      { status }
    );
  }
}
