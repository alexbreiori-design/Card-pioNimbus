import { CATEGORY_LAYOUT_DEFAULT, normalizeCategoryLayout } from '@/lib/cardapio/categoryLayouts';

const PRODUCT_EXTRA_KEYS = [
  'adicionais',
  'adicionaisConfig',
  'pecaTambemIds',
  'tags',
  'precoPorTamanho',
  'comboGrupoId',
  'marmitaGrupoId',
];

const ADDON_CATEGORY_EXTRA_KEYS = ['descricao', 'imagemUrl'];
const ADDON_ITEM_EXTRA_KEYS = ['precoPorTamanho'];

function pickExtra(source, keys) {
  if (!source || typeof source !== 'object') return {};
  const extra = {};
  for (const key of keys) {
    if (source[key] !== undefined) extra[key] = source[key];
  }
  return extra;
}

export function categoryToRow(empresaId, category) {
  return {
    empresa_id: empresaId,
    id: String(category.id),
    nome: String(category.nome || '').trim() || 'Sem nome',
    icone: category.icone || 'burger',
    ordem: Number(category.ordem ?? 0),
    ativo: category.ativo !== false,
  };
}

export function categoryFromRow(row, layoutByCategoryId = {}) {
  const fromModule = layoutByCategoryId[row.id];
  const fromColumn = row.exibicao_cardapio;
  return {
    id: row.id,
    nome: row.nome,
    icone: row.icone || 'burger',
    exibicaoCardapio: normalizeCategoryLayout(fromModule ?? fromColumn ?? CATEGORY_LAYOUT_DEFAULT),
    ordem: row.ordem ?? 0,
    ativo: row.ativo !== false,
  };
}

export function productToRow(empresaId, product) {
  return {
    empresa_id: empresaId,
    id: String(product.id),
    categoria_id: String(product.categoriaId || ''),
    nome: String(product.nome || '').trim() || 'Sem nome',
    descricao: product.descricao || '',
    preco: Number(product.preco ?? 0),
    imagem_url: product.imagemUrl || '',
    ordem: Number(product.ordem ?? 0),
    ativo: product.ativo !== false,
    tipo: product.tipo || 'comum',
    extra: pickExtra(product, PRODUCT_EXTRA_KEYS),
  };
}

export function productFromRow(row) {
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  return {
    id: row.id,
    categoriaId: row.categoria_id,
    nome: row.nome,
    descricao: row.descricao || '',
    preco: Number(row.preco ?? 0),
    imagemUrl: row.imagem_url || '',
    ordem: row.ordem ?? 0,
    ativo: row.ativo !== false,
    tipo: row.tipo || 'comum',
    ...extra,
  };
}

export function addonCategoryToRow(empresaId, category) {
  return {
    empresa_id: empresaId,
    id: String(category.id),
    nome: String(category.nome || '').trim() || 'Adicionais',
    tipo_selecao: category.tipoSelecao || 'multipla',
    min: Number(category.min ?? 0),
    max: Number(category.max ?? 99),
    obrigatorio: category.obrigatorio === true,
    ordem: Number(category.ordem ?? 0),
    ativo: category.ativo !== false,
    extra: pickExtra(category, ADDON_CATEGORY_EXTRA_KEYS),
  };
}

export function addonCategoryFromRow(row) {
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  return {
    id: row.id,
    nome: row.nome,
    tipoSelecao: row.tipo_selecao || 'multipla',
    min: row.min ?? 0,
    max: row.max ?? 99,
    obrigatorio: row.obrigatorio === true,
    ordem: row.ordem ?? 0,
    ativo: row.ativo !== false,
    ...extra,
  };
}

export function addonItemToRow(empresaId, item) {
  return {
    empresa_id: empresaId,
    id: String(item.id),
    categoria_id: String(item.categoriaId || ''),
    nome: String(item.nome || '').trim() || 'Item',
    descricao: item.descricao || '',
    preco: Number(item.preco ?? 0),
    imagem_url: item.imagemUrl || '',
    ordem: Number(item.ordem ?? 0),
    ativo: item.ativo !== false,
    extra: pickExtra(item, ADDON_ITEM_EXTRA_KEYS),
  };
}

export function addonItemFromRow(row) {
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  return {
    id: row.id,
    categoriaId: row.categoria_id,
    nome: row.nome,
    descricao: row.descricao || '',
    preco: Number(row.preco ?? 0),
    imagemUrl: row.imagem_url || '',
    ordem: row.ordem ?? 0,
    ativo: row.ativo !== false,
    ...extra,
  };
}
