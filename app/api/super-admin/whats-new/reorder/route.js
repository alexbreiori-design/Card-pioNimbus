import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request) {
  try {
    await requireSuperAdmin();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const orderedIds = Array.isArray(body.orderedIds)
      ? body.orderedIds.map((id) => String(id || '').trim()).filter(Boolean)
      : [];

    if (!orderedIds.length) {
      return NextResponse.json({ ok: false, error: 'Lista de ordem inválida.' }, { status: 400 });
    }

    const unique = new Set(orderedIds);
    if (unique.size !== orderedIds.length) {
      return NextResponse.json({ ok: false, error: 'IDs duplicados na ordem.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const results = await Promise.all(
      orderedIds.map((id, index) =>
        supabase
          .from('whats_new_entries')
          .update({ sort_order: index, updated_at: now })
          .eq('id', id)
          .select('id')
          .maybeSingle()
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao reordenar novidades.' },
      { status: error?.status || 500 }
    );
  }
}
