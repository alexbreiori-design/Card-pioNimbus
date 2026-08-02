import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { mapWhatsNewEntry, resolveEmpresaIdBySlug } from '@/lib/whatsNew';

export async function GET(request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');
  const mode = String(url.searchParams.get('mode') || 'unseen').trim().toLowerCase();

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  try {
    await requireStoreAdmin(slug);
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }

    const empresaId = await resolveEmpresaIdBySlug(supabase, slug);
    if (!empresaId) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const { data: rows, error } = await supabase
      .from('whats_new_entries')
      .select('*')
      .eq('status', 'published')
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false });
    if (error) throw error;

    let items = (rows || []).map((row) => mapWhatsNewEntry(row));

    if (mode !== 'all') {
      const { data: views, error: viewsError } = await supabase
        .from('whats_new_store_views')
        .select('entry_id')
        .eq('empresa_id', empresaId);
      if (viewsError) throw viewsError;
      const seen = new Set((views || []).map((row) => row.entry_id));
      items = items.filter((item) => !seen.has(item.id));
    }

    return NextResponse.json({ ok: true, items, empresaId });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar novidades.' },
      { status: error?.status || 500 }
    );
  }
}
