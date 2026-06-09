import { pizzaUid } from '@/lib/pizza/pizzaIds';
import { normalizePecaTambemIds } from '@/lib/productSuggestions';

function sortByOrdem(list) {
  return [...list].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

const EMPTY_SELECTION = {
  categoriaIds: [],
  itemIds: [],
};

const EMPTY_ADDON_RULES = {
  grupos: {},
};

export function defaultPizzaTamanhos() {
  return [
    { id: pizzaUid('tam'), nome: 'Broto', descricaoFatias: '4 fatias', ativo: true, ordem: 0 },
    { id: pizzaUid('tam'), nome: 'Média', descricaoFatias: '8 fatias', ativo: true, ordem: 1 },
    { id: pizzaUid('tam'), nome: 'Grande', descricaoFatias: '12 fatias', ativo: true, ordem: 2 },
  ];
}

export function emptyPizzaSabor() {
  return {
    id: pizzaUid('sab'),
    nome: '',
    descricao: '',
    imagemUrl: '',
    tamanhoIds: [],
    precos: {},
    ativo: true,
    ordem: 0,
  };
}

export function emptyPizzaCategoria() {
  return {
    id: pizzaUid('cat'),
    nomePublico: '',
    descricao: '',
    imagemUrl: '',
    ativo: true,
    ordem: 0,
    saborIds: [],
    tamanhoIds: [],
    minSabores: 1,
    maxSabores: 2,
    regraPreco: 'mais_caro',
    permitirSaboresDuplicados: false,
    adicionais: { ...EMPTY_SELECTION },
    adicionaisConfig: { ...EMPTY_ADDON_RULES },
    pecaTambemIds: [],
    entregaRetirada: true,
    mesaBalcao: true,
  };
}

export function emptyPizzaCardapio() {
  return {
    tamanhos: defaultPizzaTamanhos(),
    sabores: [],
    categorias: [],
  };
}

function selectionFrom(value) {
  return {
    categoriaIds: Array.isArray(value?.categoriaIds) ? value.categoriaIds : [],
    itemIds: Array.isArray(value?.itemIds) ? value.itemIds : [],
  };
}

function normalizeAddonRules(value) {
  return {
    grupos: value?.grupos && typeof value.grupos === 'object' ? value.grupos : {},
  };
}

export function normalizePizzaTamanho(raw, index = 0) {
  const item = raw && typeof raw === 'object' ? raw : {};
  return {
    id: item.id || pizzaUid('tam'),
    nome: String(item.nome ?? '').trim() || `Tamanho ${index + 1}`,
    descricaoFatias: String(item.descricaoFatias ?? ''),
    ativo: item.ativo !== false,
    ordem: item.ordem ?? index,
  };
}

export function normalizePizzaSabor(raw, index = 0, tamanhoIds = []) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const precos = item.precos && typeof item.precos === 'object' ? item.precos : {};
  const safeTamanhoIds = Array.isArray(item.tamanhoIds)
    ? item.tamanhoIds.filter(Boolean)
    : tamanhoIds.filter((tamId) => precos[tamId] !== undefined && precos[tamId] !== '');

  return {
    id: item.id || pizzaUid('sab'),
    nome: String(item.nome ?? ''),
    descricao: String(item.descricao ?? ''),
    imagemUrl: String(item.imagemUrl ?? ''),
    tamanhoIds: safeTamanhoIds,
    precos: Object.fromEntries(Object.entries(precos).map(([tamId, value]) => [tamId, value ?? ''])),
    ativo: item.ativo !== false,
    ordem: item.ordem ?? index,
  };
}

export function normalizePizzaCategoria(raw, index = 0) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const minSabores = Math.min(4, Math.max(1, Number(item.minSabores || 1)));
  const maxSabores = Math.min(4, Math.max(minSabores, Number(item.maxSabores || minSabores)));

  return {
    id: item.id || pizzaUid('cat'),
    nomePublico: String(item.nomePublico ?? '').trim() || 'Pizza',
    descricao: String(item.descricao ?? ''),
    imagemUrl: String(item.imagemUrl ?? ''),
    ativo: item.ativo !== false,
    ordem: item.ordem ?? index,
    saborIds: Array.isArray(item.saborIds) ? item.saborIds.filter(Boolean) : [],
    tamanhoIds: Array.isArray(item.tamanhoIds) ? item.tamanhoIds.filter(Boolean) : [],
    minSabores,
    maxSabores,
    regraPreco: item.regraPreco === 'media' ? 'media' : 'mais_caro',
    permitirSaboresDuplicados: item.permitirSaboresDuplicados === true,
    adicionais: selectionFrom(item.adicionais),
    adicionaisConfig: normalizeAddonRules(item.adicionaisConfig),
    pecaTambemIds: normalizePecaTambemIds(item.pecaTambemIds),
    entregaRetirada: item.entregaRetirada !== false,
    mesaBalcao: item.mesaBalcao !== false,
  };
}

/** Normaliza o módulo completo de pizza (tamanhos, sabores, categorias). */
export function normalizePizzaCardapio(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const tamanhos = sortByOrdem(
    Array.isArray(item.tamanhos) && item.tamanhos.length ? item.tamanhos : defaultPizzaTamanhos()
  ).map((tam, index) => normalizePizzaTamanho(tam, index));

  const tamanhoIds = tamanhos.map((tam) => tam.id);
  const sabores = sortByOrdem(Array.isArray(item.sabores) ? item.sabores : []).map((sabor, index) =>
    normalizePizzaSabor(sabor, index, tamanhoIds)
  );
  const categorias = sortByOrdem(Array.isArray(item.categorias) ? item.categorias : []).map((cat, index) =>
    normalizePizzaCategoria(cat, index)
  );

  return { tamanhos, sabores, categorias };
}

export function getActivePizzaTamanhos(cardapio) {
  return normalizePizzaCardapio(cardapio).tamanhos.filter((item) => item.ativo !== false);
}

export function getActivePizzaSabores(cardapio) {
  return normalizePizzaCardapio(cardapio).sabores.filter(
    (item) => item.ativo !== false && String(item.nome || '').trim()
  );
}

export function getActivePizzaCategorias(cardapio) {
  return normalizePizzaCardapio(cardapio).categorias.filter(
    (item) => item.ativo !== false && String(item.nomePublico || '').trim()
  );
}

export function getCategoriaTamanhos(cardapio, categoria) {
  const normalized = normalizePizzaCardapio(cardapio);
  const cat = normalizePizzaCategoria(categoria);
  const allowed = new Set(cat.tamanhoIds);
  return normalized.tamanhos.filter((tam) => tam.ativo !== false && allowed.has(tam.id));
}

export function getCategoriaSabores(cardapio, categoria) {
  const normalized = normalizePizzaCardapio(cardapio);
  const cat = normalizePizzaCategoria(categoria);
  const allowed = new Set(cat.saborIds);
  return normalized.sabores.filter(
    (sabor) => sabor.ativo !== false && allowed.has(sabor.id) && String(sabor.nome || '').trim()
  );
}

/** @deprecated formato monolítico — use normalizePizzaCardapio */
export function normalizePizza(raw, { fillDefaults = true } = {}) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const tamanhos = sortByOrdem(
    Array.isArray(item.tamanhos) && item.tamanhos.length ? item.tamanhos : defaultPizzaTamanhos()
  ).map((tam, index) => ({
    ...normalizePizzaTamanho(tam, index),
    maxSabores: Math.min(4, Math.max(1, Number(tam.maxSabores || item.maxSabores || 1))),
  }));

  const sabores = sortByOrdem(Array.isArray(item.sabores) ? item.sabores : []).map((sabor, index) => {
    const precos = sabor.precos && typeof sabor.precos === 'object' ? sabor.precos : {};
    return {
      id: sabor.id || pizzaUid('sab'),
      nome: fillDefaults ? String(sabor.nome || '').trim() : String(sabor.nome ?? ''),
      descricao: String(sabor.descricao ?? ''),
      imagemUrl: String(sabor.imagemUrl ?? ''),
      precos: Object.fromEntries(Object.entries(precos).map(([tamId, value]) => [tamId, value ?? ''])),
      ativo: sabor.ativo !== false,
      ordem: sabor.ordem ?? index,
    };
  });

  const maxSabores = Math.min(
    4,
    Math.max(1, Number(item.maxSabores || tamanhos[0]?.maxSabores || 1))
  );
  const categoria = normalizePizzaCategoria({
    minSabores: 1,
    maxSabores,
    regraPreco: item.regraPreco,
    permitirSaboresDuplicados: item.permitirSaboresDuplicados,
    adicionais: item.adicionais,
    adicionaisConfig: item.adicionaisConfig,
    pecaTambemIds: item.pecaTambemIds,
    entregaRetirada: item.entregaRetirada,
    mesaBalcao: item.mesaBalcao,
  });
  return {
    id: item.id || pizzaUid('piz'),
    ativo: item.ativo !== false,
    ordem: item.ordem ?? 0,
    tagAdmin: String(item.tagAdmin ?? ''),
    nomePublico: fillDefaults
      ? String(item.nomePublico || '').trim() || String(item.tagAdmin || '').trim() || 'Pizza'
      : String(item.nomePublico ?? ''),
    descricao: String(item.descricao ?? ''),
    imagemUrl: String(item.imagemUrl ?? ''),
    tamanhos,
    sabores,
    adicionais: categoria.adicionais,
    adicionaisConfig: categoria.adicionaisConfig,
    regraPreco: categoria.regraPreco,
    permitirSaboresDuplicados: categoria.permitirSaboresDuplicados,
    entregaRetirada: categoria.entregaRetirada,
    mesaBalcao: categoria.mesaBalcao,
    pecaTambemIds: categoria.pecaTambemIds,
  };
}

/** @deprecated */
export function normalizePizzas(list) {
  return sortByOrdem((Array.isArray(list) ? list : []).map((item) => normalizePizza(item)));
}

