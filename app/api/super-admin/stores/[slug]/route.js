import { NextResponse } from 'next/server';
import { loadStoreDetail, updateStoreFields } from '@/lib/superAdmin/storeDetail';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { normalizeSlug } from '@/lib/normalize';

export async function GET(_request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  try {
    await requireSuperAdmin();

    const store = await loadStoreDetail(supabase, safeSlug);
    if (!store) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, store });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar loja.' },
      { status }
    );
  }
}

export async function PATCH(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    await requireSuperAdmin();

    const updated = await updateStoreFields(supabase, safeSlug, {
      data_go_live: body.data_go_live,
      notas_nimbus: body.notas_nimbus,
      responsavel_nimbus: body.responsavel_nimbus,
      contrato_inicio: body.contrato_inicio,
      contrato_fim: body.contrato_fim,
    });

    return NextResponse.json({ ok: true, store: updated });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar loja.' },
      { status }
    );
  }
}
