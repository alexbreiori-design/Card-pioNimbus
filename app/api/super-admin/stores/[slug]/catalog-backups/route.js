import { NextResponse } from 'next/server';
import { backupStoreCatalogForSlug } from '@/lib/catalog/dailyCatalogBackup';
import { normalizeSlug } from '@/lib/normalize';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

const RETENTION_DAYS = 7;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const dateParam = String(url.searchParams.get('date') || '').trim();

  try {
    await requireSuperAdmin();

    if (!dateParam) {
      const { data, error } = await supabase
        .from('store_catalog_daily_backups')
        .select('backup_date, created_at')
        .eq('slug', safeSlug)
        .order('backup_date', { ascending: false })
        .limit(RETENTION_DAYS);

      if (error) throw error;

      return NextResponse.json({
        ok: true,
        retentionDays: RETENTION_DAYS,
        backups: (data || []).map((row) => ({
          backupDate: row.backup_date,
          createdAt: row.created_at,
        })),
      });
    }

    if (!DATE_RE.test(dateParam)) {
      return NextResponse.json({ ok: false, error: 'Data inválida.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('store_catalog_daily_backups')
      .select('payload, backup_date')
      .eq('slug', safeSlug)
      .eq('backup_date', dateParam)
      .maybeSingle();

    if (error) throw error;
    if (!data?.payload) {
      return NextResponse.json(
        { ok: false, error: 'Nenhum backup encontrado para esta data.' },
        { status: 404 }
      );
    }

    const filename = `cardapio-${safeSlug}-backup-${dateParam}.json`;
    return new NextResponse(JSON.stringify(data.payload, null, 2), {
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
      { ok: false, error: error?.message || 'Erro ao carregar backups.' },
      { status }
    );
  }
}

/** Gera (ou atualiza) o backup do dia para esta loja — sem esperar o cron. */
export async function POST(_request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  try {
    await requireSuperAdmin();
    const result = await backupStoreCatalogForSlug(supabase, safeSlug);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Não foi possível gerar o backup.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('store_catalog_daily_backups')
      .select('backup_date, created_at')
      .eq('slug', safeSlug)
      .order('backup_date', { ascending: false })
      .limit(RETENTION_DAYS);

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      backupDate: result.backupDate,
      retentionDays: RETENTION_DAYS,
      backups: (data || []).map((row) => ({
        backupDate: row.backup_date,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao gerar backup.' },
      { status }
    );
  }
}
