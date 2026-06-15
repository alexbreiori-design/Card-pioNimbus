import {
  assembleStoreState,
  extractCatalogModules,
  extractMarmitaFromState,
  extractPizzaFromState,
  extractStoreConfig,
} from '@/lib/catalog/assembleStoreState';
import {
  addonCategoryToRow,
  addonItemToRow,
  categoryToRow,
  productToRow,
} from '@/lib/catalog/catalogRowMappers';
import { cupomToRow } from '@/lib/catalog/cupomRowMappers';
import {
  marmitaGrupoToRow,
  marmitaToRow,
} from '@/lib/catalog/marmitaRowMappers';
import {
  pizzaCategoriaToRow,
  pizzaSaborToRow,
  pizzaTamanhoToRow,
} from '@/lib/catalog/pizzaRowMappers';
import { buildCatalogPublic } from '@/lib/catalogPublic';
import { normalizeSlug } from '@/lib/normalize';
import { getEmpresaBySlug } from '@/lib/supabase/empresaServer';

const MENU_TABLE = 'menu_store_state';

async function syncEntityTable(supabase, table, empresaId, entities, toRow, idField = 'id') {
  const rows = (entities || []).map((entity) => toRow(empresaId, entity));
  const keepIds = rows.map((row) => row[idField]);

  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows, { onConflict: `empresa_id,${idField}` });
    if (error) throw error;
  }

  let deleteQuery = supabase.from(table).delete().eq('empresa_id', empresaId);
  if (keepIds.length) {
    deleteQuery = deleteQuery.not(idField, 'in', `(${keepIds.map((id) => `"${id}"`).join(',')})`);
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;
}

async function syncCuponsTable(supabase, empresaId, cupons) {
  const rows = (cupons || []).map((cupom) => cupomToRow(empresaId, cupom));
  const keepIds = rows.map((row) => row.legacy_id).filter(Boolean);

  if (rows.length) {
    const { error } = await supabase
      .from('cupons')
      .upsert(rows, { onConflict: 'empresa_id,legacy_id' });
    if (error) throw error;
  }

  let deleteQuery = supabase.from('cupons').delete().eq('empresa_id', empresaId);
  if (keepIds.length) {
    deleteQuery = deleteQuery.not('legacy_id', 'in', `(${keepIds.map((id) => `"${id}"`).join(',')})`);
  }
  const { error: deleteError } = await deleteQuery;
  if (deleteError) throw deleteError;
}

async function syncMarmitaSettings(supabase, empresaId, cardapio) {
  const { error } = await supabase.from('store_marmita_settings').upsert(
    {
      empresa_id: empresaId,
      data: cardapio && typeof cardapio === 'object' ? cardapio : {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'empresa_id' }
  );
  if (error) throw error;
}

async function syncModules(supabase, empresaId, state) {
  const modules = extractCatalogModules(state);
  const rows = modules.map(({ module, data }) => ({
    empresa_id: empresaId,
    module,
    data,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('store_catalog_modules')
    .upsert(rows, { onConflict: 'empresa_id,module' });
  if (error) throw error;
}

async function loadModularParts(supabase, empresaId, slug) {
  const [
    menuRow,
    categorias,
    produtos,
    addonCategories,
    addonItems,
    pizzaTamanhos,
    pizzaSabores,
    pizzaCategorias,
    marmitaGrupos,
    marmitas,
    marmitaSettings,
    modules,
    cupons,
  ] = await Promise.all([
    supabase
      .from(MENU_TABLE)
      .select('slug,store_config,catalog_public,updated_at,catalog_modular_at')
      .eq('slug', slug)
      .maybeSingle(),
    supabase
      .from('store_catalog_categorias')
      .select('id,nome,icone,ordem,ativo')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
    supabase
      .from('store_catalog_produtos')
      .select('id,categoria_id,nome,descricao,preco,imagem_url,ordem,ativo,tipo,extra')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
    supabase
      .from('store_catalog_addon_categories')
      .select('id,nome,tipo_selecao,min,max,obrigatorio,ordem,ativo,extra')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
    supabase
      .from('store_catalog_addon_items')
      .select('id,categoria_id,nome,descricao,preco,imagem_url,ordem,ativo,extra')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
    supabase
      .from('store_pizza_tamanhos')
      .select('id,nome,descricao_fatias,ordem,ativo')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
    supabase
      .from('store_pizza_sabores')
      .select('id,nome,descricao,imagem_url,ordem,ativo,extra')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
    supabase
      .from('store_pizza_categorias')
      .select('id,nome_publico,descricao,imagem_url,ordem,ativo,extra')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
    supabase
      .from('store_marmita_grupos')
      .select('id,nome,ordem,ativo,extra')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
    supabase
      .from('store_marmitas')
      .select(
        'id,tag_admin,nome_publico,descricao,imagem_url,categoria_id,grupo_id,dia_semana,ordem,ativo,extra'
      )
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
    supabase
      .from('store_marmita_settings')
      .select('data')
      .eq('empresa_id', empresaId)
      .maybeSingle(),
    supabase.from('store_catalog_modules').select('module,data').eq('empresa_id', empresaId),
    supabase
      .from('cupons')
      .select('id,legacy_id,codigo,tipo_desconto,valor_desconto,percentual_desconto,ativo,ordem')
      .eq('empresa_id', empresaId)
      .order('ordem', { ascending: true }),
  ]);

  const errors = [
    menuRow,
    categorias,
    produtos,
    addonCategories,
    addonItems,
    pizzaTamanhos,
    pizzaSabores,
    pizzaCategorias,
    marmitaGrupos,
    marmitas,
    marmitaSettings,
    modules,
    cupons,
  ];
  for (const result of errors) {
    if (result.error) throw result.error;
  }

  return {
    menuRow: menuRow.data,
    categorias: categorias.data || [],
    produtos: produtos.data || [],
    addonCategories: addonCategories.data || [],
    addonItems: addonItems.data || [],
    pizzaTamanhos: pizzaTamanhos.data || [],
    pizzaSabores: pizzaSabores.data || [],
    pizzaCategorias: pizzaCategorias.data || [],
    marmitaGrupos: marmitaGrupos.data || [],
    marmitas: marmitas.data || [],
    marmitaCardapio: marmitaSettings.data?.data || {},
    modules: modules.data || [],
    cupons: cupons.data || [],
  };
}

function usesModularStorage(menuRow) {
  return Boolean(menuRow?.catalog_modular_at || menuRow?.store_config);
}

export async function loadAssembledStoreState(supabase, slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;

  const empresa = await getEmpresaBySlug(supabase, safeSlug);
  if (!empresa?.id) return null;

  const parts = await loadModularParts(supabase, empresa.id, safeSlug);
  const { menuRow } = parts;
  if (!menuRow) return null;

  const storeConfig = menuRow.store_config || {};
  const assembled = assembleStoreState({
    storeConfig: usesModularStorage(menuRow) ? storeConfig : {},
    categorias: parts.categorias,
    produtos: parts.produtos,
    addonCategories: parts.addonCategories,
    addonItems: parts.addonItems,
    pizzaTamanhos: parts.pizzaTamanhos,
    pizzaSabores: parts.pizzaSabores,
    pizzaCategorias: parts.pizzaCategorias,
    marmitaGrupos: parts.marmitaGrupos,
    marmitas: parts.marmitas,
    marmitaCardapio: parts.marmitaCardapio,
    modules: parts.modules,
    cupons: parts.cupons,
  });

  return {
    slug: menuRow.slug,
    data: assembled,
    catalog_public: menuRow.catalog_public || null,
    updated_at: menuRow.updated_at,
    source: usesModularStorage(menuRow) ? 'modular' : 'empty',
  };
}

export async function persistModularStoreState(supabase, slug, state) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) throw new Error('Slug invalido para salvar cardapio.');

  const empresa = await getEmpresaBySlug(supabase, safeSlug);
  if (!empresa?.id) {
    throw Object.assign(new Error('Empresa não encontrada para este slug.'), { status: 404 });
  }

  const empresaId = empresa.id;
  const storeConfig = extractStoreConfig(state);
  const pizza = extractPizzaFromState(state);
  const marmita = extractMarmitaFromState(state);
  const now = new Date().toISOString();

  await Promise.all([
    syncEntityTable(
      supabase,
      'store_catalog_categorias',
      empresaId,
      state.categorias,
      categoryToRow
    ),
    syncEntityTable(supabase, 'store_catalog_produtos', empresaId, state.produtos, productToRow),
    syncEntityTable(
      supabase,
      'store_catalog_addon_categories',
      empresaId,
      state.adicionaisCategorias,
      addonCategoryToRow
    ),
    syncEntityTable(
      supabase,
      'store_catalog_addon_items',
      empresaId,
      state.adicionaisItens,
      addonItemToRow
    ),
    syncEntityTable(
      supabase,
      'store_pizza_tamanhos',
      empresaId,
      pizza.tamanhos,
      pizzaTamanhoToRow
    ),
    syncEntityTable(supabase, 'store_pizza_sabores', empresaId, pizza.sabores, pizzaSaborToRow),
    syncEntityTable(
      supabase,
      'store_pizza_categorias',
      empresaId,
      pizza.categorias,
      pizzaCategoriaToRow
    ),
    syncEntityTable(supabase, 'store_marmita_grupos', empresaId, marmita.grupos, marmitaGrupoToRow),
    syncEntityTable(supabase, 'store_marmitas', empresaId, marmita.marmitas, marmitaToRow),
    syncMarmitaSettings(supabase, empresaId, marmita.cardapio),
    syncCuponsTable(supabase, empresaId, state.cupons),
    syncModules(supabase, empresaId, state),
  ]);

  const assembled = assembleStoreState({
    storeConfig,
    categorias: (state.categorias || []).map((item) => categoryToRow(empresaId, item)),
    produtos: (state.produtos || []).map((item) => productToRow(empresaId, item)),
    addonCategories: (state.adicionaisCategorias || []).map((item) =>
      addonCategoryToRow(empresaId, item)
    ),
    addonItems: (state.adicionaisItens || []).map((item) => addonItemToRow(empresaId, item)),
    pizzaTamanhos: pizza.tamanhos.map((item) => pizzaTamanhoToRow(empresaId, item)),
    pizzaSabores: pizza.sabores.map((item) => pizzaSaborToRow(empresaId, item)),
    pizzaCategorias: pizza.categorias.map((item) => pizzaCategoriaToRow(empresaId, item)),
    marmitaGrupos: marmita.grupos.map((item) => marmitaGrupoToRow(empresaId, item)),
    marmitas: marmita.marmitas.map((item) => marmitaToRow(empresaId, item)),
    marmitaCardapio: marmita.cardapio,
    modules: extractCatalogModules(state).map(({ module, data }) => ({ module, data })),
    cupons: (state.cupons || []).map((item) => cupomToRow(empresaId, item)),
  });

  const catalog_public = buildCatalogPublic(assembled);
  const payload = {
    slug: safeSlug,
    store_config: storeConfig,
    catalog_public,
    catalog_modular_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(MENU_TABLE)
    .upsert(payload, { onConflict: 'slug' })
    .select('slug,catalog_public,updated_at,catalog_modular_at,store_config')
    .single();
  if (error) throw error;
  return data;
}

export async function rebuildCatalogPublicForSlug(supabase, slug) {
  const loaded = await loadAssembledStoreState(supabase, slug);
  if (!loaded?.data) return null;

  const catalog_public = buildCatalogPublic(loaded.data);
  if (!catalog_public) return null;

  const safeSlug = normalizeSlug(slug);
  const { data, error } = await supabase
    .from(MENU_TABLE)
    .update({ catalog_public })
    .eq('slug', safeSlug)
    .select('slug,catalog_public,updated_at')
    .maybeSingle();
  if (error) throw error;
  return data;
}
