import { NextResponse } from 'next/server';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { mapAssinaturaRow } from '@/lib/stripe/assinaturas';
import { getStripe } from '@/lib/stripe/client';
import { listConfiguredPlans } from '@/lib/stripe/plans';

async function listClientEmpresas(supabase) {
  const { data, error } = await supabase
    .from('empresas')
    .select('id, slug, nome, suspensa, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).filter((row) => !isModelStoreSlug(row.slug));
}

async function loadAssinaturasByEmpresaId(supabase, empresaIds) {
  const map = new Map();
  if (!empresaIds.length) return map;
  try {
    const { data, error } = await supabase
      .from('empresa_assinaturas')
      .select('*')
      .in('empresa_id', empresaIds);
    if (error) throw error;
    (data || []).forEach((row) => map.set(row.empresa_id, row));
  } catch (error) {
    console.warn('[super-admin/billing] empresa_assinaturas indisponível:', error?.message || error);
  }
  return map;
}

export async function GET() {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireSuperAdmin();

    const empresas = await listClientEmpresas(supabase);
    const empresaIds = empresas.map((row) => row.id);
    const assinaturasById = await loadAssinaturasByEmpresaId(supabase, empresaIds);

    const stores = empresas.map((row) => ({
      id: row.id,
      slug: row.slug,
      nome: row.nome,
      suspensa: Boolean(row.suspensa),
      assinatura: mapAssinaturaRow(assinaturasById.get(row.id) || null),
    }));

    let mrrCentavos = 0;
    const counts = {
      none: 0,
      trialing: 0,
      active: 0,
      past_due: 0,
      canceled: 0,
      unpaid: 0,
      incomplete: 0,
      incomplete_expired: 0,
      paused: 0,
      cortesia: 0,
    };

    stores.forEach((store) => {
      const assinatura = store.assinatura;
      if (assinatura.statusLocal === 'cortesia') {
        counts.cortesia += 1;
      } else if (Object.prototype.hasOwnProperty.call(counts, assinatura.status)) {
        counts[assinatura.status] += 1;
      }
      if (assinatura.statusLocal !== 'cortesia' && ['active', 'trialing'].includes(assinatura.status)) {
        mrrCentavos += Number(assinatura.valorCentavos || 0);
      }
    });

    return NextResponse.json({
      ok: true,
      stores,
      mrrCentavos,
      counts,
      plans: listConfiguredPlans(),
      stripeConfigured: Boolean(getStripe()),
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar comercial.' },
      { status }
    );
  }
}
