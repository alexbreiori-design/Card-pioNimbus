import { NextResponse } from 'next/server';
import { getSiteOrigin } from '@/lib/siteUrl';
import { createStoreForSuperAdmin } from '@/lib/superAdmin/createStore';
import { sortStoresWithModelFirst, withModelStoreFlags } from '@/lib/superAdmin/modelStore';
import { enrichStoresForList } from '@/lib/superAdmin/storeMetrics';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

const EMPRESA_SELECT_BASE =
  'id, slug, nome, telefone, email, endereco_cidade, segmento, aberta, created_at, logo_url';
const EMPRESA_SELECT_EXTENDED = `${EMPRESA_SELECT_BASE}, compartilha_metricas_nimbus, data_go_live, suspensa, suspensa_em`;

async function listEmpresas(supabase) {
  const extended = await supabase
    .from('empresas')
    .select(EMPRESA_SELECT_EXTENDED)
    .order('created_at', { ascending: false });
  if (!extended.error) return extended.data || [];

  if (
    extended.error.message?.includes('compartilha_metricas_nimbus') ||
    extended.error.message?.includes('suspensa')
  ) {
    const fallback = await supabase
      .from('empresas')
      .select(EMPRESA_SELECT_BASE)
      .order('created_at', { ascending: false });
    if (fallback.error) throw fallback.error;
    return (fallback.data || []).map((row) => ({
      ...row,
      compartilha_metricas_nimbus: true,
      data_go_live: null,
      suspensa: false,
      suspensa_em: null,
    }));
  }

  throw extended.error;
}

export async function GET(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireSuperAdmin();

    const empresas = await listEmpresas(supabase);

    const empresaIds = (empresas || []).map((row) => row.id);
    const membersByEmpresa = new Map();

    if (empresaIds.length) {
      const { data: membros, error: membrosError } = await supabase
        .from('empresa_membros')
        .select('empresa_id, usuario_id, papel, ativo')
        .in('empresa_id', empresaIds)
        .eq('ativo', true);
      if (membrosError) throw membrosError;

      (membros || []).forEach((row) => {
        if (!membersByEmpresa.has(row.empresa_id)) membersByEmpresa.set(row.empresa_id, []);
        membersByEmpresa.get(row.empresa_id).push(row);
      });
    }

    const baseStores = (empresas || []).map((row) => ({
      ...row,
      memberCount: membersByEmpresa.get(row.id)?.length || 0,
      ownerEmail: row.email || null,
    }));

    const ownerEmailById = new Map(baseStores.map((row) => [row.id, row.ownerEmail || null]));
    let stores = (await enrichStoresForList(supabase, baseStores)).map((store) => ({
      ...store,
      ownerEmail: ownerEmailById.get(store.id) || null,
    }));

    const query = String(new URL(request.url).searchParams.get('q') || '').trim().toLowerCase();
    if (query) {
      stores = stores.filter((store) => {
        const haystack = [
          store.slug,
          store.nome,
          store.endereco_cidade,
          store.segmento,
          store.ownerEmail,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    const sorted = sortStoresWithModelFirst(
      stores.map(({ ownerEmail: _ownerEmail, ...safeStore }) => safeStore)
    );

    return NextResponse.json({
      ok: true,
      stores: withModelStoreFlags(sorted),
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao listar lojas.' },
      { status }
    );
  }
}

export async function POST(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    await requireSuperAdmin();

    const result = await createStoreForSuperAdmin(supabase, body);
    const origin = getSiteOrigin();

    return NextResponse.json({
      ok: true,
      store: {
        ...result.empresa,
        cardapioUrl: `${origin}/${result.empresa.slug}`,
        loginUrl: `${origin}/login`,
      },
      ownerEmail: result.ownerEmail,
      createdAuthUser: result.createdAuthUser,
      tempPassword: result.tempPassword,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao criar loja.' },
      { status }
    );
  }
}
