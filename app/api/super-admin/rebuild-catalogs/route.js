import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { rebuildAllCatalogPublicServer } from '@/lib/supabase/storeStateServer';

export async function POST() {
  try {
    await requireSuperAdmin();
    const results = await rebuildAllCatalogPublicServer();
    const okCount = results.filter((item) => item.ok).length;
    return NextResponse.json({
      ok: true,
      rebuilt: okCount,
      total: results.length,
      results,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao reconstruir catálogos públicos.' },
      { status }
    );
  }
}
