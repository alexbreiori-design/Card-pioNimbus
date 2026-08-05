import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { resolveEmpresaIdBySlug } from '@/lib/whatsNew';

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const slug = normalizeSlug(body.slug || '');
  const entryIds = Array.isArray(body.entryIds)
    ? body.entryIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }
  if (!entryIds.length) {
    return NextResponse.json({ ok: true, acknowledged: 0 });
  }

  try {
    const user = await requireStoreAdmin(slug);
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }

    const empresaId = await resolveEmpresaIdBySlug(supabase, slug);
    if (!empresaId) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const rows = entryIds.map((entryId) => ({
      empresa_id: empresaId,
      entry_id: entryId,
      seen_by_user_id: user.id,
      seen_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('whats_new_store_views').upsert(rows, {
      onConflict: 'empresa_id,entry_id',
    });
    if (error) throw error;

    return NextResponse.json({ ok: true, acknowledged: rows.length });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao registrar visualização.' },
      { status: error?.status || 500 }
    );
  }
}
