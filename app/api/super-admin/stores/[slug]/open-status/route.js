import { NextResponse } from 'next/server';
import { setStoreRemoteOpenStatus } from '@/lib/superAdmin/storeRemoteOps';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { normalizeSlug } from '@/lib/normalize';

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

    if (typeof body.fechadaManual !== 'boolean') {
      return NextResponse.json(
        { ok: false, error: 'Informe fechadaManual (true ou false).' },
        { status: 400 }
      );
    }

    const status = await setStoreRemoteOpenStatus(supabase, safeSlug, body.fechadaManual);
    return NextResponse.json({ ok: true, ...status });
  } catch (error) {
    const statusCode = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar status da loja.' },
      { status: statusCode }
    );
  }
}
