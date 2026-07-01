import { normalizeMarmitaGrupo } from '@/lib/marmita/marmitaModel';

const MARMITA_EXTRA_KEYS = [
  'tamanhos',
  'passos',
  'passosConfig',
  'menuSemanal',
  'excecoesDia',
  'pecaTambemIds',
  'vitrine',
  'entregaRetirada',
  'mesaBalcao',
];

function pickExtra(source, keys) {
  if (!source || typeof source !== 'object') return {};
  const extra = {};
  for (const key of keys) {
    if (source[key] !== undefined) extra[key] = source[key];
  }
  return extra;
}

export function marmitaGrupoToRow(empresaId, item) {
  return {
    empresa_id: empresaId,
    id: String(item.id),
    nome: String(item.nome || '').trim(),
    ordem: Number(item.ordem ?? 0),
    ativo: item.ativo !== false,
    extra: {
      permitirDiasDuplicados: item.permitirDiasDuplicados === true,
      exibicaoCardapio: item.exibicaoCardapio,
      icone: item.icone,
    },
  };
}

export function marmitaGrupoFromRow(row, layoutByGrupoId = {}) {
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  const fromModule = layoutByGrupoId[row.id];
  return normalizeMarmitaGrupo({
    id: row.id,
    nome: row.nome || '',
    ordem: row.ordem ?? 0,
    ativo: row.ativo !== false,
    permitirDiasDuplicados: extra.permitirDiasDuplicados === true,
    exibicaoCardapio: fromModule ?? extra.exibicaoCardapio,
    icone: extra.icone,
  });
}

export function marmitaToRow(empresaId, item) {
  return {
    empresa_id: empresaId,
    id: String(item.id),
    tag_admin: String(item.tagAdmin || ''),
    nome_publico: String(item.nomePublico || ''),
    descricao: String(item.descricao || ''),
    imagem_url: String(item.imagemUrl || ''),
    categoria_id: String(item.categoriaId || ''),
    grupo_id: String(item.grupoId || ''),
    dia_semana: String(item.diaSemana || ''),
    ordem: Number(item.ordem ?? 0),
    ativo: item.ativo !== false,
    extra: pickExtra(item, MARMITA_EXTRA_KEYS),
  };
}

export function marmitaFromRow(row) {
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  return {
    id: row.id,
    tagAdmin: row.tag_admin || '',
    nomePublico: row.nome_publico || '',
    descricao: row.descricao || '',
    imagemUrl: row.imagem_url || '',
    categoriaId: row.categoria_id || '',
    grupoId: row.grupo_id || '',
    diaSemana: row.dia_semana || '',
    ordem: row.ordem ?? 0,
    ativo: row.ativo !== false,
    ...extra,
  };
}
