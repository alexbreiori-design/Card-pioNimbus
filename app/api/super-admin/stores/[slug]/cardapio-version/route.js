import { NextResponse } from 'next/server';
import { CARDAPIO_PUBLIC_VERSION_V1, CARDAPIO_PUBLIC_VERSION_V2 } from '@/lib/cardapioPublicVersion';
import { setStoreCardapioPublicVersion } from '@/lib/superAdmin/storeCardapioVersion';
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
  const version = String(body.version || '').trim().toLowerCase();

  if (version !== CARDAPIO_PUBLIC_VERSION_V1 && version !== CARDAPIO_PUBLIC_VERSION_V2) {
    return NextResponse.json(
      { ok: false, error: 'Informe version: "v1" ou "v2".' },
      { status: 400 }
    );
  }

  try {
    await requireSuperAdmin();

    const result = await setStoreCardapioPublicVersion(supabase, safeSlug, version);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const statusCode = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar versão do cardápio.' },
      { status: statusCode }
    );
  }
}
