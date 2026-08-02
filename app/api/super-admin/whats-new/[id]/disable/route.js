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

    const { data, error } = await supabase
      .from('whats_new_entries')
      .update({
        status: 'disabled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Novidade não encontrada.' }, { status: 404 });
    }

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
      { ok: false, error: error?.message || 'Erro ao desativar novidade.' },
      { status: error?.status || 500 }
    );
  }
}
