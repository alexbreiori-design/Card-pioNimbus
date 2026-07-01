import { NextResponse } from 'next/server';
import { applyCatalogImport } from '@/lib/catalogImport/nimbusCatalogImport';
import { resolveCatalogImportAssets } from '@/lib/catalogImport/resolveCatalogImportAssets';
import { normalizeSlug } from '@/lib/normalize';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { normalizeStoreStateImages } from '@/lib/storage/normalizeStoreImages';
import { uploadMenuAssetFromDataUrl } from '@/lib/storage/uploadMenuAssetServer';
import { fetchStoreStateBySlugServer, upsertStoreStateServer } from '@/lib/supabase/storeStateServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const payload = body?.payload;
  const mode = body?.mode === 'merge' ? 'merge' : 'replace';
  const dryRun = body?.dryRun !== false;

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ ok: false, error: 'Envie o JSON em payload.' }, { status: 400 });
  }

  try {
    await requireSuperAdmin();
    const row = await fetchStoreStateBySlugServer(safeSlug);
    const currentData = row?.data || {};
    const result = applyCatalogImport(payload, currentData, { mode, dryRun: dryRun });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          dryRun,
          preview: result.preview,
          error: result.preview.errors[0] || 'Arquivo inválido.',
        },
        { status: 400 }
      );
    }

    if (dryRun) {
      return NextResponse.json({
        ok: true,
        dryRun: true,
        preview: result.preview,
      });
    }

    const { state: withAssetUrls, stats: assetStats } = await resolveCatalogImportAssets(
      supabase,
      safeSlug,
      result.data,
      payload
    );

    const withStorageUrls = await normalizeStoreStateImages(withAssetUrls, safeSlug, (storeSlug, dataUrl, folder) =>
      uploadMenuAssetFromDataUrl(supabase, storeSlug, dataUrl, { folder })
    );
    const saved = await upsertStoreStateServer(safeSlug, withStorageUrls);
    return NextResponse.json({
      ok: true,
      dryRun: false,
      preview: {
        ...result.preview,
        images: assetStats,
      },
      updated_at: saved.updated_at,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao importar cardápio.' },
      { status }
    );
  }
}
