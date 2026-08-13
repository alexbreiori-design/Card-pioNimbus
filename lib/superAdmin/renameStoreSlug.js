import { rebuildCatalogPublicForSlug } from '@/lib/catalog/storeCatalogRepository';
import { normalizeSlug } from '@/lib/normalize';
import { isValidStoreSlug } from '@/lib/superAdmin';
import { isModelStoreSlug } from '@/lib/superAdmin/modelStore';

const MENU_TABLE = 'menu_store_state';

async function assertSlugAvailable(supabase, slug, excludeSlug = null) {
  const { data, error } = await supabase.from('empresas').select('id').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (data?.id && normalizeSlug(excludeSlug) !== slug) {
    throw Object.assign(new Error('Este slug já está em uso.'), { status: 409 });
  }
}

async function patchMenuStoreConfigLoja(supabase, slug, lojaPatch) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug || !lojaPatch || !Object.keys(lojaPatch).length) return;

  const { data, error } = await supabase
    .from(MENU_TABLE)
    .select('store_config')
    .eq('slug', safeSlug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const storeConfig = data.store_config && typeof data.store_config === 'object' ? data.store_config : {};
  const loja = { ...(storeConfig.loja || {}), ...lojaPatch };

  const { error: updateError } = await supabase
    .from(MENU_TABLE)
    .update({
      store_config: { ...storeConfig, loja },
      updated_at: new Date().toISOString(),
    })
    .eq('slug', safeSlug);
  if (updateError) throw updateError;
}

async function restoreMenuRow(supabase, slug, menuRow) {
  if (!menuRow) return;
  await supabase.from(MENU_TABLE).insert({
    slug,
    store_config: menuRow.store_config ?? {},
    catalog_public: menuRow.catalog_public ?? null,
    catalog_modular_at: menuRow.catalog_modular_at ?? null,
    updated_at: new Date().toISOString(),
  });
}

export async function renameStoreSlug(supabase, oldSlug, newSlug) {
  const oldSafe = normalizeSlug(oldSlug);
  const newSafe = normalizeSlug(newSlug);

  if (!oldSafe || !newSafe) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }
  if (oldSafe === newSafe) {
    return { slug: newSafe, renamed: false };
  }
  if (!isValidStoreSlug(newSafe)) {
    throw Object.assign(
      new Error('Slug inválido. Use letras minúsculas, números e hífens (2–48 caracteres).'),
      { status: 400 }
    );
  }
  if (isModelStoreSlug(oldSafe)) {
    throw Object.assign(new Error('A loja modelo não pode ter o slug alterado.'), { status: 400 });
  }

  await assertSlugAvailable(supabase, newSafe, oldSafe);

  // PK da tabela é `slug` (sem coluna `id`). FK: menu.slug → empresas.slug sem ON UPDATE CASCADE,
  // então: ler menu → apagar menu → renomear empresa → reinserir menu.
  const { data: menuRow, error: menuError } = await supabase
    .from(MENU_TABLE)
    .select('slug, store_config, catalog_public, catalog_modular_at')
    .eq('slug', oldSafe)
    .maybeSingle();
  if (menuError) throw menuError;

  if (menuRow) {
    const { error: delError } = await supabase.from(MENU_TABLE).delete().eq('slug', oldSafe);
    if (delError) throw delError;
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .update({ slug: newSafe, updated_at: new Date().toISOString() })
    .eq('slug', oldSafe)
    .select('id, slug')
    .maybeSingle();

  if (empresaError || !empresa?.id) {
    try {
      await restoreMenuRow(supabase, oldSafe, menuRow);
    } catch {
      /* best-effort */
    }
    if (empresaError) throw empresaError;
    throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
  }

  if (menuRow) {
    const storeConfig =
      menuRow.store_config && typeof menuRow.store_config === 'object' ? menuRow.store_config : {};
    const loja = { ...(storeConfig.loja || {}), slug: newSafe };

    const { error: insertError } = await supabase.from(MENU_TABLE).insert({
      slug: newSafe,
      store_config: { ...storeConfig, loja },
      catalog_public: menuRow.catalog_public ?? null,
      catalog_modular_at: menuRow.catalog_modular_at ?? null,
      updated_at: new Date().toISOString(),
    });
    if (insertError) {
      try {
        await supabase
          .from('empresas')
          .update({ slug: oldSafe, updated_at: new Date().toISOString() })
          .eq('slug', newSafe);
        await restoreMenuRow(supabase, oldSafe, menuRow);
      } catch {
        /* best-effort */
      }
      throw insertError;
    }

    try {
      await rebuildCatalogPublicForSlug(supabase, newSafe);
    } catch {
      /* store_config já tem o slug novo; catalog_public pode ser regenerado depois */
    }
  }

  return { slug: newSafe, previousSlug: oldSafe, renamed: true };
}

export async function updateStoreSegmento(supabase, slug, segmento) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }

  const nextSegmento = String(segmento || '').trim() || null;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('empresas')
    .update({ segmento: nextSegmento, updated_at: now })
    .eq('slug', safeSlug)
    .select('slug, segmento')
    .maybeSingle();
  if (error) throw error;
  if (!data?.slug) {
    throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
  }

  await patchMenuStoreConfigLoja(supabase, safeSlug, { segmento: nextSegmento || '' });

  return data;
}
