import { NextResponse } from 'next/server';
import { resetStoreOwnerPassword } from '@/lib/superAdmin/resetOwnerPassword';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { normalizeSlug } from '@/lib/normalize';

export async function POST(_request, { params }) {
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
    const result = await resetStoreOwnerPassword(supabase, safeSlug);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao resetar senha.' },
      { status }
    );
  }
}
