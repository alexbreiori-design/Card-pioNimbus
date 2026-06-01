import { NextResponse } from 'next/server';
import { withDerivedData } from '@/lib/adminData';
import { requireStoreAdmin, getAuthenticatedUser, userHasStoreMembership } from '@/lib/supabase/membership';
import { stampStoreMeta } from '@/lib/storeStateMerge';
import { sanitizePublicStoreState } from '@/lib/storeStatePublic';
import {
  fetchPublicStoreCatalogMeta,
  fetchPublicStoreCatalogRow,
  fetchStoreStateBySlugServer,
  upsertStoreStateServer,
} from '@/lib/supabase/storeStateServer';

export async function GET(request) {
  const url = new URL(request.url);
  const slug = String(url.searchParams.get('slug') || '')
    .trim()
    .toLowerCase();
  const scope = String(url.searchParams.get('scope') || 'public').toLowerCase();
  const metaOnly = url.searchParams.get('meta') === '1';

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  try {
    if (metaOnly) {
      if (scope === 'admin') {
        const user = await getAuthenticatedUser();
        if (!user) {
          return NextResponse.json({ ok: false, error: 'Autenticação necessária.' }, { status: 401 });
        }
        const allowed = await userHasStoreMembership(user.id, slug);
        if (!allowed) {
          return NextResponse.json({ ok: false, error: 'Sem permissão para esta loja.' }, { status: 403 });
        }
        const row = await fetchStoreStateBySlugServer(slug);
        return NextResponse.json({
          ok: true,
          slug,
          updated_at: row?.updated_at ?? null,
        });
      }

      const meta = await fetchPublicStoreCatalogMeta(slug);
      return NextResponse.json({
        ok: true,
        slug: meta?.slug ?? slug,
        updated_at: meta?.updated_at ?? null,
      });
    }

    const row =
      scope === 'admin'
        ? await fetchStoreStateBySlugServer(slug)
        : await fetchPublicStoreCatalogRow(slug);
    if (!row) {
      return NextResponse.json({ ok: true, slug, data: null, updated_at: null });
    }

    if (scope === 'admin') {
      const user = await getAuthenticatedUser();
      if (!user) {
        return NextResponse.json({ ok: false, error: 'Autenticação necessária.' }, { status: 401 });
      }
      const allowed = await userHasStoreMembership(user.id, slug);
      if (!allowed) {
        return NextResponse.json({ ok: false, error: 'Sem permissão para esta loja.' }, { status: 403 });
      }
      return NextResponse.json({
        ok: true,
        slug: row.slug,
        data: row.data,
        updated_at: row.updated_at,
      });
    }

    return NextResponse.json({
      ok: true,
      slug: row.slug,
      data: sanitizePublicStoreState(row.data),
      updated_at: row.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar estado.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().toLowerCase();
  const incoming = body.data;

  if (!slug || !incoming) {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  try {
    await requireStoreAdmin(slug);
    const stamped = stampStoreMeta(withDerivedData(incoming));
    const saved = await upsertStoreStateServer(slug, stamped);
    return NextResponse.json({
      ok: true,
      slug: saved.slug,
      updated_at: saved.updated_at,
    });
  } catch (error) {
    const status = error?.status || (error?.message?.includes('SERVICE_ROLE') ? 503 : 500);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao salvar estado.' },
      { status }
    );
  }
}
