export function marmitaUid(prefix = 'marm') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultMarmitaTamanhos() {
  return [
    { id: marmitaUid('tam'), nome: 'Mini', preco: '', ativo: true, ordem: 0 },
    { id: marmitaUid('tam'), nome: 'Média', preco: '', ativo: true, ordem: 1 },
    { id: marmitaUid('tam'), nome: 'Grande', preco: '', ativo: true, ordem: 2 },
  ];
}

export function emptyMarmitaGrupo() {
  return {
    id: marmitaUid('mgr'),
    nome: '',
    ativo: true,
    ordem: 0,
    permitirDiasDuplicados: false,
  };
}

export function normalizeMarmitaGrupo(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  return {
    id: item.id || marmitaUid('mgr'),
    nome: String(item.nome || '').trim(),
    ativo: item.ativo !== false,
    ordem: item.ordem ?? 0,
    permitirDiasDuplicados: item.permitirDiasDuplicados === true,
  };
}

export function emptyMarmita() {
  return {
    id: marmitaUid('marm'),
    ativo: true,
    ordem: 0,
    tagAdmin: '',
    nomePublico: '',
    descricao: '',
    imagemUrl: '',
    categoriaId: '',
    grupoId: '',
    diaSemana: 'segunda',
    tamanhos: defaultMarmitaTamanhos(),
    passos: [],
    passosConfig: { grupos: {} },
    menuSemanal: {},
    excecoesDia: {},
    pecaTambemIds: [],
    vitrine: false,
    entregaRetirada: true,
    mesaBalcao: true,
  };
}

function sortByOrdem(list) {
  return [...list].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

export function normalizeMarmita(raw) {
  const item = raw && typeof raw === 'object' ? raw : {};
  const tamanhos = sortByOrdem(
    Array.isArray(item.tamanhos) && item.tamanhos.length
      ? item.tamanhos
      : defaultMarmitaTamanhos()
  ).map((tam, index) => ({
    id: tam.id || marmitaUid('tam'),
    nome: String(tam.nome || '').trim() || `Tamanho ${index + 1}`,
    preco: tam.preco ?? '',
    ativo: tam.ativo !== false,
    ordem: tam.ordem ?? index,
  }));

  const passos = sortByOrdem(Array.isArray(item.passos) ? item.passos : []).map((passo, index) => ({
    id: passo.id || marmitaUid('passo'),
    titulo: String(passo.titulo || '').trim(),
    categoriaAdicionalId: String(passo.categoriaAdicionalId || '').trim(),
    itemIds: Array.isArray(passo.itemIds) ? passo.itemIds.filter(Boolean) : [],
    obrigatorio: passo.obrigatorio === true,
    min: Number(passo.min ?? (passo.obrigatorio ? 1 : 0)),
    max: Number(passo.max ?? 1),
    tipoSelecao: passo.tipoSelecao === 'multipla' ? 'multipla' : 'simples',
    ordem: passo.ordem ?? index,
  }));

  return {
    id: item.id || marmitaUid('marm'),
    ativo: item.ativo !== false,
    ordem: item.ordem ?? 0,
    tagAdmin: String(item.tagAdmin || '').trim(),
    nomePublico: String(item.nomePublico || item.nomeBase || '').trim(),
    descricao: String(item.descricao || '').trim(),
    imagemUrl: String(item.imagemUrl || '').trim(),
    categoriaId: String(item.categoriaId || '').trim(),
    grupoId: String(item.grupoId || '').trim(),
    diaSemana: String(item.diaSemana || '').trim(),
    tamanhos,
    passos,
    passosConfig:
      item.passosConfig && typeof item.passosConfig === 'object'
        ? { grupos: { ...(item.passosConfig.grupos || {}) } }
        : { grupos: {} },
    menuSemanal:
      item.menuSemanal && typeof item.menuSemanal === 'object' ? { ...item.menuSemanal } : {},
    excecoesDia:
      item.excecoesDia && typeof item.excecoesDia === 'object' ? { ...item.excecoesDia } : {},
    pecaTambemIds: Array.isArray(item.pecaTambemIds) ? item.pecaTambemIds : [],
    vitrine: item.vitrine === true,
    entregaRetirada: item.entregaRetirada !== false,
    mesaBalcao: item.mesaBalcao !== false,
  };
}

export function normalizeMarmitas(list) {
  return sortByOrdem((Array.isArray(list) ? list : []).map(normalizeMarmita));
}
