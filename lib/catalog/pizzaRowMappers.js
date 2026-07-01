const PIZZA_CATEGORIA_EXTRA_KEYS = [
  'saborIds',
  'tamanhoIds',
  'minSabores',
  'maxSabores',
  'regraPreco',
  'permitirSaboresDuplicados',
  'adicionais',
  'adicionaisConfig',
  'pecaTambemIds',
  'entregaRetirada',
  'mesaBalcao',
  'exibicaoCardapio',
];

function pickExtra(source, keys) {
  if (!source || typeof source !== 'object') return {};
  const extra = {};
  for (const key of keys) {
    if (source[key] !== undefined) extra[key] = source[key];
  }
  return extra;
}

export function pizzaTamanhoToRow(empresaId, item) {
  return {
    empresa_id: empresaId,
    id: String(item.id),
    nome: String(item.nome || '').trim() || 'Tamanho',
    descricao_fatias: String(item.descricaoFatias || ''),
    ordem: Number(item.ordem ?? 0),
    ativo: item.ativo !== false,
  };
}

export function pizzaTamanhoFromRow(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricaoFatias: row.descricao_fatias || '',
    ordem: row.ordem ?? 0,
    ativo: row.ativo !== false,
  };
}

export function pizzaSaborToRow(empresaId, item) {
  return {
    empresa_id: empresaId,
    id: String(item.id),
    nome: String(item.nome || '').trim(),
    descricao: String(item.descricao || ''),
    imagem_url: String(item.imagemUrl || ''),
    ordem: Number(item.ordem ?? 0),
    ativo: item.ativo !== false,
    extra: {
      tamanhoIds: Array.isArray(item.tamanhoIds) ? item.tamanhoIds : [],
      precos: item.precos && typeof item.precos === 'object' ? item.precos : {},
    },
  };
}

export function pizzaSaborFromRow(row) {
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || '',
    imagemUrl: row.imagem_url || '',
    ordem: row.ordem ?? 0,
    ativo: row.ativo !== false,
    tamanhoIds: Array.isArray(extra.tamanhoIds) ? extra.tamanhoIds : [],
    precos: extra.precos && typeof extra.precos === 'object' ? extra.precos : {},
  };
}

export function pizzaCategoriaToRow(empresaId, item) {
  return {
    empresa_id: empresaId,
    id: String(item.id),
    nome_publico: String(item.nomePublico || '').trim() || 'Pizza',
    descricao: String(item.descricao || ''),
    imagem_url: String(item.imagemUrl || ''),
    ordem: Number(item.ordem ?? 0),
    ativo: item.ativo !== false,
    extra: pickExtra(item, PIZZA_CATEGORIA_EXTRA_KEYS),
  };
}

export function pizzaCategoriaFromRow(row) {
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  return {
    id: row.id,
    nomePublico: row.nome_publico || 'Pizza',
    descricao: row.descricao || '',
    imagemUrl: row.imagem_url || '',
    ordem: row.ordem ?? 0,
    ativo: row.ativo !== false,
    ...extra,
  };
}
