import { applyScheduleOpenStatus, resolveStoreOpenStatus } from '@/lib/storeHours';
import { normalizeSlug } from '@/lib/normalize';
import { fetchStoreStateBySlugServer, upsertStoreStateServer } from '@/lib/supabase/storeStateServer';

export async function setStoreRemoteOpenStatus(supabase, slug, fechadaManual) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }

  const row = await fetchStoreStateBySlugServer(safeSlug);
  const state = row?.data || { loja: {} };
  const loja = state.loja || {};
  const nextLoja = applyScheduleOpenStatus({
    ...loja,
    fechadaManual: Boolean(fechadaManual),
  });
  const { aberta } = resolveStoreOpenStatus(nextLoja);

  await upsertStoreStateServer(safeSlug, {
    ...state,
    loja: {
      ...nextLoja,
      fechadaManual: Boolean(fechadaManual),
      aberta,
    },
  });

  const { error } = await supabase
    .from('empresas')
    .update({ aberta, updated_at: new Date().toISOString() })
    .eq('slug', safeSlug);
  if (error) throw error;

  return { aberta, fechadaManual: Boolean(fechadaManual) };
}
