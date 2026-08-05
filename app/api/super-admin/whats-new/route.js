import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { countActiveStores, clampDurationSeconds, mapWhatsNewEntry, mediaPayloadFromBody } from '@/lib/whatsNew';

export async function GET() {
  try {
    await requireSuperAdmin();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }

    const { data: rows, error } = await supabase
      .from('whats_new_entries')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) throw error;

    const storesTotal = await countActiveStores(supabase);
    const ids = (rows || []).map((row) => row.id);
    const viewsByEntry = new Map();

    if (ids.length) {
      const { data: views, error: viewsError } = await supabase
        .from('whats_new_store_views')
        .select('entry_id')
        .in('entry_id', ids);
      if (viewsError) throw viewsError;
      for (const view of views || []) {
        viewsByEntry.set(view.entry_id, (viewsByEntry.get(view.entry_id) || 0) + 1);
      }
    }

    const items = (rows || []).map((row) =>
      mapWhatsNewEntry(row, {
        viewsCount: viewsByEntry.get(row.id) || 0,
        storesTotal,
      })
    );

    return NextResponse.json({ ok: true, items, storesTotal });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao listar novidades.' },
      { status: error?.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    const admin = await requireSuperAdmin();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    if (!title) {
      return NextResponse.json({ ok: false, error: 'Informe o título.' }, { status: 400 });
    }

    const ctaLabel = String(body.ctaLabel || body.cta_label || '').trim() || null;
    const ctaHref = String(body.ctaHref || body.cta_href || '').trim() || null;
    const media = mediaPayloadFromBody(body);
    const durationSeconds = clampDurationSeconds(
      body.durationSeconds ?? body.duration_seconds,
      8
    );
    const publishNow = Boolean(body.publish);

    const { data: maxRows, error: maxError } = await supabase
      .from('whats_new_entries')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);
    if (maxError) throw maxError;
    const maxSort = maxRows?.[0]?.sort_order;
    const nextSortOrder = maxSort == null ? 0 : (Number(maxSort) || 0) + 1;

    const payload = {
      title,
      description,
      media_path: media.media_path,
      media_paths: media.media_paths,
      media_type: media.media_type,
      cta_label: ctaLabel,
      cta_href: ctaHref,
      duration_seconds: durationSeconds,
      sort_order: nextSortOrder,
      status: publishNow ? 'published' : 'draft',
      published_at: publishNow ? new Date().toISOString() : null,
      created_by: admin.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('whats_new_entries')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;

    const storesTotal = await countActiveStores(supabase);
    return NextResponse.json({
      ok: true,
      item: mapWhatsNewEntry(data, { viewsCount: 0, storesTotal }),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao criar novidade.' },
      { status: error?.status || 500 }
    );
  }
}
