import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { countActiveStores, mapWhatsNewEntry } from '@/lib/whatsNew';

export async function POST(_request, { params }) {
  try {
    await requireSuperAdmin();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }
    const { id } = await params;

    const { data: existing, error: loadError } = await supabase
      .from('whats_new_entries')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Novidade não encontrada.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('whats_new_entries')
      .update({
        status: 'published',
        published_at: existing.published_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    const storesTotal = await countActiveStores(supabase);
    const { count } = await supabase
      .from('whats_new_store_views')
      .select('empresa_id', { count: 'exact', head: true })
      .eq('entry_id', id);

    return NextResponse.json({
      ok: true,
      item: mapWhatsNewEntry(data, {
        viewsCount: Number(count || 0),
        storesTotal,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao publicar novidade.' },
      { status: error?.status || 500 }
    );
  }
}
