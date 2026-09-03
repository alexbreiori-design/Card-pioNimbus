import { buildFriendlyCatalogExport } from '@/lib/catalogImport/nimbusCatalogImport';
import { fetchStoreStateBySlugServer } from '@/lib/supabase/storeStateServer';

const RETENTION_DAYS = 7;

function todayUtcDateString() {
  return new Date().toISOString().slice(0, 10);
}

function cutoffDateString(days = RETENTION_DAYS) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  return cutoff.toISOString().slice(0, 10);
}

export async function runDailyCatalogBackups(supabase) {
  if (!supabase) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente.');

  const { data: rows, error: listError } = await supabase.from('menu_store_state').select('slug');
  if (listError) throw listError;

  const backupDate = todayUtcDateString();
  const results = [];

  for (const row of rows || []) {
    const slug = String(row.slug || '').trim().toLowerCase();
    if (!slug) continue;

    try {
      const stateRow = await fetchStoreStateBySlugServer(slug);
      if (!stateRow?.data) {
        results.push({ slug, ok: false, error: 'Estado vazio.' });
        continue;
      }

      const payload = buildFriendlyCatalogExport(stateRow.data, { slug });
      const { error: upsertError } = await supabase.from('store_catalog_daily_backups').upsert(
        {
          slug,
          backup_date: backupDate,
          payload,
        },
        { onConflict: 'slug,backup_date' }
      );

      if (upsertError) {
        results.push({ slug, ok: false, error: upsertError.message });
        continue;
      }

      results.push({ slug, ok: true, backupDate });
    } catch (err) {
      results.push({ slug, ok: false, error: err?.message || 'Erro desconhecido.' });
    }
  }

  const cutoff = cutoffDateString();
  const { error: purgeError, count: purged } = await supabase
    .from('store_catalog_daily_backups')
    .delete({ count: 'exact' })
    .lt('backup_date', cutoff);

  return {
    backupDate,
    retentionDays: RETENTION_DAYS,
    cutoff,
    processed: results.length,
    ok: results.filter((row) => row.ok).length,
    failed: results.filter((row) => !row.ok).length,
    purged: purged ?? null,
    purgeError: purgeError?.message || null,
    results,
  };
}
