import { NextResponse } from 'next/server';
import {
  buildCatalogExportOutline,
  buildFriendlyCatalogExport,
} from '@/lib/catalogImport/nimbusCatalogImport';
import { normalizeSlug } from '@/lib/normalize';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { fetchStoreStateBySlugServer } from '@/lib/supabase/storeStateServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

function parseListParam(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCategoryIdsParam(url) {
  const map = {};
  for (const key of ['produtos', 'adicionais', 'pizzas', 'marmitas']) {
    const ids = parseListParam(url.searchParams.get(`cat_${key}`) || url.searchParams.get(key));
    if (ids.length) map[key] = ids;
  }
  // Also support JSON blob: categoryIds={"produtos":["id1"]}
  const raw = url.searchParams.get('categoryIds');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        for (const [moduleKey, ids] of Object.entries(parsed)) {
          const list = Array.isArray(ids) ? ids.map(String) : parseListParam(ids);
          if (list.length) map[moduleKey] = list;
        }
      }
    } catch {
      /* ignore invalid JSON */
    }
  }
  return Object.keys(map).length ? map : null;
}

export async function GET(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  const url = new URL(request.url);
  const asTemplate = url.searchParams.get('template') === '1';
  const asOutline = url.searchParams.get('outline') === '1';

  try {
    await requireSuperAdmin();

    if (asTemplate) {
      const { getCatalogImportTemplate } = await import('@/lib/catalogImport/nimbusCatalogImport');
      const template = getCatalogImportTemplate({ slug: safeSlug });
      const filename = `modelo-cardapio-${safeSlug}.json`;
      return new NextResponse(JSON.stringify(template, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const row = await fetchStoreStateBySlugServer(safeSlug);

    if (asOutline) {
      return NextResponse.json({
        ok: true,
        outline: buildCatalogExportOutline(row?.data || {}),
      });
    }

    const modules = parseListParam(url.searchParams.get('modules'));
    const categoryIds = parseCategoryIdsParam(url);
    const exportPayload = buildFriendlyCatalogExport(row?.data || {}, {
      slug: safeSlug,
      modules: modules.length ? modules : null,
      categoryIds,
    });
    const filename = `cardapio-${safeSlug}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao exportar cardápio.' },
      { status }
    );
  }
}
