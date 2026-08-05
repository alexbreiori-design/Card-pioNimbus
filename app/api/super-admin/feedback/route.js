import { NextResponse } from 'next/server';
import { mapNimbusFeedback } from '@/lib/nimbusFeedback';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireSuperAdmin();

    const status = String(new URL(request.url).searchParams.get('status') || '').trim();

    let query = supabase
      .from('nimbus_feedback')
      .select('*, empresas ( slug, nome )')
      .order('created_at', { ascending: false })
      .limit(100);
    if (['aberto', 'lido', 'arquivado'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = (data || []).map((row) => ({
      ...mapNimbusFeedback(row),
      slug: row.empresas?.slug || null,
      lojaNome: row.empresas?.nome || null,
    }));

    const { count: abertos, error: countError } = await supabase
      .from('nimbus_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aberto');
    if (countError) throw countError;

    return NextResponse.json({ ok: true, items, abertos: abertos || 0 });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar feedback.' },
      { status }
    );
  }
}
