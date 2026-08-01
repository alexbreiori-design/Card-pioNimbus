import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { countActiveStores, clampDurationSeconds, mapWhatsNewEntry } from '@/lib/whatsNew';

async function loadEntry(supabase, id) {
  const { data, error } = await supabase
    .from('whats_new_entries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function withMetrics(supabase, row) {
  const storesTotal = await countActiveStores(supabase);
  const { count, error } = await supabase
    .from('whats_new_store_views')
    .select('empresa_id', { count: 'exact', head: true })
    .eq('entry_id', row.id);
  if (error) throw error;
  return mapWhatsNewEntry(row, {
    viewsCount: Number(count || 0),
    storesTotal,
  });
}

export async function GET(_request, { params }) {
  try {
    await requireSuperAdmin();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }
    const { id } = await params;
    const row = await loadEntry(supabase, id);
    if (!row) {
      return NextResponse.json({ ok: false, error: 'Novidade não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: await withMetrics(supabase, row) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar novidade.' },
      { status: error?.status || 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    await requireSuperAdmin();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }
    const { id } = await params;
    const existing = await loadEntry(supabase, id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Novidade não encontrada.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const patch = { updated_at: new Date().toISOString() };

    if (body.title !== undefined) {
      const title = String(body.title || '').trim();
      if (!title) {
        return NextResponse.json({ ok: false, error: 'Informe o título.' }, { status: 400 });
      }
      patch.title = title;
    }
    if (body.description !== undefined) {
      patch.description = String(body.description || '').trim();
    }
    if (body.ctaLabel !== undefined || body.cta_label !== undefined) {
      patch.cta_label = String(body.ctaLabel ?? body.cta_label ?? '').trim() || null;
    }
    if (body.ctaHref !== undefined || body.cta_href !== undefined) {
      patch.cta_href = String(body.ctaHref ?? body.cta_href ?? '').trim() || null;
    }
    if (body.mediaPath !== undefined || body.media_path !== undefined) {
      patch.media_path = String(body.mediaPath ?? body.media_path ?? '').trim() || null;
    }
    if (body.mediaType !== undefined || body.media_type !== undefined) {
      const mediaType = String(body.mediaType ?? body.media_type ?? '').trim();
      patch.media_type = mediaType === 'image' || mediaType === 'video' ? mediaType : null;
    }
    if (body.sortOrder !== undefined || body.sort_order !== undefined) {
      patch.sort_order = Number(body.sortOrder ?? body.sort_order) || 0;
    }
    if (body.durationSeconds !== undefined || body.duration_seconds !== undefined) {
      patch.duration_seconds = clampDurationSeconds(
        body.durationSeconds ?? body.duration_seconds,
        8
      );
    }

    if (body.status !== undefined) {
      const status = String(body.status || '').trim();
      if (!['draft', 'published', 'disabled'].includes(status)) {
        return NextResponse.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
      }
      patch.status = status;
      if (status === 'published' && !existing.published_at && body.keepPublishedAt !== true) {
        patch.published_at = new Date().toISOString();
      }
      if (status === 'draft') {
        patch.published_at = null;
      }
    }

    const { data, error } = await supabase
      .from('whats_new_entries')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, item: await withMetrics(supabase, data) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar novidade.' },
      { status: error?.status || 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    await requireSuperAdmin();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }
    const { id } = await params;
    const existing = await loadEntry(supabase, id);
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Novidade não encontrada.' }, { status: 404 });
    }

    if (existing.media_path) {
      await supabase.storage.from('whats-new').remove([existing.media_path]).catch(() => null);
    }

    const { error } = await supabase.from('whats_new_entries').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao remover novidade.' },
      { status: error?.status || 500 }
    );
  }
}
