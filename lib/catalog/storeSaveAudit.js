export function buildCatalogSaveSummary(state) {
  const data = state && typeof state === 'object' ? state : {};
  return {
    revision: Number(data._meta?.revision || 0),
    produtos: Array.isArray(data.produtos) ? data.produtos.length : 0,
    categorias: Array.isArray(data.categorias) ? data.categorias.length : 0,
    adicionaisItens: Array.isArray(data.adicionaisItens) ? data.adicionaisItens.length : 0,
    adicionaisCategorias: Array.isArray(data.adicionaisCategorias)
      ? data.adicionaisCategorias.length
      : 0,
    marmitas: Array.isArray(data.marmitas) ? data.marmitas.length : 0,
  };
}

/** Registra save do catálogo; nunca lança — falha silenciosa para não bloquear gravação. */
export async function logStoreCatalogSave(supabase, entry) {
  if (!supabase || !entry?.slug) return;

  try {
    const slug = String(entry.slug).trim().toLowerCase();
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    const { error } = await supabase.from('store_catalog_save_log').insert({
      empresa_id: empresa?.id || null,
      slug,
      source: String(entry.source || 'unknown').slice(0, 64),
      actor_user_id: entry.actorUserId || null,
      actor_email: entry.actorEmail ? String(entry.actorEmail).slice(0, 320) : null,
      revision_before:
        entry.revisionBefore == null ? null : Number(entry.revisionBefore) || 0,
      revision_after: entry.revisionAfter == null ? null : Number(entry.revisionAfter) || 0,
      summary: entry.summary && typeof entry.summary === 'object' ? entry.summary : {},
    });

    if (error) {
      console.error('[storeSaveAudit] insert failed:', error.message);
    }
  } catch (err) {
    console.error('[storeSaveAudit]', err?.message || err);
  }
}
