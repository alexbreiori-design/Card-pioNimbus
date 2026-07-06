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

  const { data: menuRow, error: menuError } = await supabase
    .from(MENU_TABLE)
    .select('id, store_config')
    .eq('slug', oldSafe)
    .maybeSingle();
  if (menuError) throw menuError;

  if (menuRow) {
    const storeConfig =
      menuRow.store_config && typeof menuRow.store_config === 'object' ? menuRow.store_config : {};
    const loja = { ...(storeConfig.loja || {}), slug: newSafe };

    const { error: menuUpdateError } = await supabase
      .from(MENU_TABLE)
      .update({
        slug: newSafe,
        store_config: { ...storeConfig, loja },
        updated_at: new Date().toISOString(),
      })
      .eq('slug', oldSafe);
    if (menuUpdateError) throw menuUpdateError;
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .update({ slug: newSafe, updated_at: new Date().toISOString() })
    .eq('slug', oldSafe)
    .select('id, slug')
    .maybeSingle();
  if (empresaError) throw empresaError;
  if (!empresa?.id) {
    throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
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
