import { NextResponse } from 'next/server';
import { buildStoreBackup } from '@/lib/superAdmin/storeBackup';
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
    const backup = await buildStoreBackup(supabase, safeSlug);
    const filename = `backup-${safeSlug}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao exportar backup.' },
      { status }
    );
  }
}
