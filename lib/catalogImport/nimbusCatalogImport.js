import { withDerivedData } from '@/lib/adminData';
import { normalizeMarmitaCardapio } from '@/lib/marmita/marmitaCardapio';
import { normalizeMarmita } from '@/lib/marmita/marmitaModel';
import { normalizePizzaCardapio } from '@/lib/pizza/pizzaModel';
import { stampStoreMeta } from '@/lib/storeStateMerge';

export const NIMBUS_CATALOG_IMPORT_VERSION = 1;

const MODULE_ORDER = ['adicionais', 'produtos', 'pizzas', 'marmitas'];

const DIA_SEMANA_ALIASES = {
  seg: 'segunda',
  segunda: 'segunda',
  mon: 'segunda',
  ter: 'terca',
  terca: 'terca',
  tuesday: 'terca',
  qua: 'quarta',
  quarta: 'quarta',
  wed: 'quarta',
  qui: 'quinta',
  quinta: 'quinta',
  thu: 'quinta',
  sex: 'sexta',
  sexta: 'sexta',
  fri: 'sexta',
  sab: 'sabado',
  sabado: 'sabado',
  sat: 'sabado',
  dom: 'domingo',
  domingo: 'domingo',
  sun: 'domingo',
};

function importUid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function normName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function parseImportPrice(value) {
  if (value === '' || value === null || value === undefined) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  const text = String(value).trim().replace(/[^\d,.-]/g, '');
  if (!text) return 0;
  const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
  const num = Number(normalized);
  return Number.isFinite(num) ? Math.max(0, num) : NaN;
}

function pushError(errors, message) {
  errors.push(message);
}

function pushWarning(warnings, message) {
  warnings.push(message);
}

function normalizeDiaSemana(value, fallback = 'segunda') {
  const key = normName(value).replace(/-/g, '');
  return DIA_SEMANA_ALIASES[key] || fallback;
}

function emptyImportTemplate() {
  return {
    version: NIMBUS_CATALOG_IMPORT_VERSION,
    slug: '',
    notas: 'Arquivo gerado pelo Nimbus. Preencha os módulos necessários e importe pelo super admin.',
    modules: {
      adicionais: {
        categorias: [
          {
            nome: 'Exemplo — Molhos',
            obrigatorio: false,
            min: 0,
            max: 3,
            tipoSelecao: 'multipla',
            itens: [{ nome: 'Barbecue', preco: 3.5, descricao: '' }],
          },
        ],
      },
      produtos: {
        categorias: [
          {
            nome: 'Exemplo — Burgers',
            icone: 'burger',
            itens: [
              {
                nome: 'Classic Burger',
                preco: 32.9,
                descricao: '180g, queijo, molho da casa',
                codigoPdv: '',
                tipo: 'comum',
              },
            ],
          },
        ],
      },
      pizzas: {
        tamanhos: [
          { nome: 'Broto', descricaoFatias: '4 fatias' },
          { nome: 'Média', descricaoFatias: '8 fatias' },
          { nome: 'Grande', descricaoFatias: '12 fatias' },
        ],
        sabores: [
          {
            nome: 'Calabresa',
            descricao: 'Calabresa, cebola, mussarela',
            precos: { Broto: 28, Média: 45, Grande: 58 },
          },
        ],
        categorias: [
          {
            nome: 'Tradicionais',
            sabores: ['Calabresa'],
            tamanhos: ['Média', 'Grande'],
            minSabores: 1,
            maxSabores: 2,
            regraPreco: 'mais_caro',
          },
        ],
      },
      marmitas: {
        grupos: [{ nome: 'Almoço' }],
        itens: [
          {
            grupo: 'Almoço',
            nome: 'Marmita Segunda',
            diaSemana: 'segunda',
            descricao: '',
            tamanhos: [{ nome: 'Média', preco: 22 }],
            passos: [
              {
                titulo: 'Escolha a proteína',
                categoriaAdicional: 'Exemplo — Proteínas',
                obrigatorio: true,
                min: 1,
                max: 1,
                tipoSelecao: 'simples',
              },
            ],
          },
        ],
        config: {
          vincularHorario: false,
          horarioInicio: '11:00',
          horarioFim: '14:00',
        },
      },
    },
  };
}

function buildAdicionaisModule(module, errors) {
  const categorias = [];
  const itens = [];
  const catNameToId = new Map();

  const sourceCats = Array.isArray(module?.categorias) ? module.categorias : [];
  sourceCats.forEach((rawCat, catIndex) => {
    const nome = String(rawCat?.nome || '').trim();
    if (!nome) {
      pushError(errors, `Adicionais: categoria #${catIndex + 1} sem nome.`);
      return;
    }
    const catId = importUid('add-cat');
    catNameToId.set(normName(nome), catId);
    categorias.push({
      id: catId,
      nome,
      ativo: rawCat?.ativo !== false,
      ordem: catIndex,
      obrigatorio: rawCat?.obrigatorio === true,
      min: Math.max(0, Number(rawCat?.min ?? (rawCat?.obrigatorio ? 1 : 0))),
      max: Math.max(0, Number(rawCat?.max ?? 99)),
      tipoSelecao: rawCat?.tipoSelecao === 'simples' ? 'simples' : 'multipla',
    });

    const sourceItems = Array.isArray(rawCat?.itens) ? rawCat.itens : [];
    sourceItems.forEach((rawItem, itemIndex) => {
      const itemNome = String(rawItem?.nome || '').trim();
      if (!itemNome) {
        pushError(errors, `Adicionais: item sem nome na categoria "${nome}".`);
        return;
      }
      const preco = parseImportPrice(rawItem?.preco);
      if (Number.isNaN(preco)) {
        pushError(errors, `Adicionais: preço inválido em "${itemNome}" (${nome}).`);
        return;
      }
      itens.push({
        id: importUid('add-item'),
        categoriaId: catId,
        nome: itemNome,
        descricao: String(rawItem?.descricao || '').trim(),
        preco,
        ativo: rawItem?.ativo !== false,
        ordem: itemIndex,
        codigoPdv: String(rawItem?.codigoPdv || '').trim(),
        entregaRetirada: rawItem?.entregaRetirada !== false,
        mesaBalcao: rawItem?.mesaBalcao !== false,
      });
    });
  });

  return { categorias, itens, catNameToId };
}

function buildProdutosModule(module, errors) {
  const categorias = [];
  const produtos = [];

  const sourceCats = Array.isArray(module?.categorias) ? module.categorias : [];
  sourceCats.forEach((rawCat, catIndex) => {
    const nome = String(rawCat?.nome || '').trim();
    if (!nome) {
      pushError(errors, `Produtos: categoria #${catIndex + 1} sem nome.`);
      return;
    }
    const catId = importUid('cat');
    categorias.push({
      id: catId,
      nome,
      icone: String(rawCat?.icone || 'burger').trim() || 'burger',
      ativo: rawCat?.ativo !== false,
      ordem: catIndex,
    });

    const sourceItems = Array.isArray(rawCat?.itens) ? rawCat.itens : [];
    sourceItems.forEach((rawItem, itemIndex) => {
      const itemNome = String(rawItem?.nome || '').trim();
      if (!itemNome) {
        pushError(errors, `Produtos: item sem nome na categoria "${nome}".`);
        return;
      }
      const preco = parseImportPrice(rawItem?.preco);
      if (Number.isNaN(preco)) {
        pushError(errors, `Produtos: preço inválido em "${itemNome}" (${nome}).`);
        return;
      }
      const tipo = rawItem?.tipo === 'combo' ? 'combo' : 'comum';
      produtos.push({
        id: importUid('prod'),
        categoriaId: catId,
        nome: itemNome,
        descricao: String(rawItem?.descricao || '').trim(),
        preco,
        ativo: rawItem?.ativo !== false,
        ordem: itemIndex,
        tipo,
        tags: tipo === 'combo' ? ['combo'] : [],
        codigoPdv: String(rawItem?.codigoPdv || '').trim(),
        medida: String(rawItem?.medida || '').trim(),
        servePessoas: rawItem?.servePessoas ?? '',
        entregaRetirada: rawItem?.entregaRetirada !== false,
        mesaBalcao: rawItem?.mesaBalcao !== false,
        ingredientesRemoviveis: tipo === 'combo' ? false : rawItem?.ingredientesRemoviveis !== false,
        adicionaisHabilitados: tipo === 'combo' ? false : rawItem?.adicionaisHabilitados !== false,
        remocoes: { categoriaIds: [], itemIds: [] },
        adicionais: { categoriaIds: [], itemIds: [] },
        adicionaisConfig: { grupos: {} },
        pecaTambemIds: [],
        imagemUrl: '',
      });
    });
  });

  return { categorias, produtos };
}

function buildPizzasModule(module, errors, warnings) {
  const tamanhos = [];
  const tamNameToId = new Map();

  const sourceTamanhos = Array.isArray(module?.tamanhos) ? module.tamanhos : [];
  sourceTamanhos.forEach((rawTam, index) => {
    const nome = String(rawTam?.nome || '').trim();
    if (!nome) {
      pushError(errors, `Pizzas: tamanho #${index + 1} sem nome.`);
      return;
    }
    const id = importUid('tam');
    tamNameToId.set(normName(nome), id);
    tamanhos.push({
      id,
      nome,
      descricaoFatias: String(rawTam?.descricaoFatias || '').trim(),
      ativo: rawTam?.ativo !== false,
      ordem: index,
    });
  });

  if (!tamanhos.length) {
    pushError(errors, 'Pizzas: informe ao menos um tamanho.');
    return null;
  }

  const sabores = [];
  const saborNameToId = new Map();
  const sourceSabores = Array.isArray(module?.sabores) ? module.sabores : [];
  sourceSabores.forEach((rawSabor, index) => {
    const nome = String(rawSabor?.nome || '').trim();
    if (!nome) {
      pushError(errors, `Pizzas: sabor #${index + 1} sem nome.`);
      return;
    }
    const precosRaw = rawSabor?.precos && typeof rawSabor.precos === 'object' ? rawSabor.precos : {};
    const precos = {};
    const tamanhoIds = [];
    Object.entries(precosRaw).forEach(([tamName, value]) => {
      const tamId = tamNameToId.get(normName(tamName));
      if (!tamId) {
        pushWarning(warnings, `Pizzas: tamanho "${tamName}" não encontrado para o sabor "${nome}".`);
        return;
      }
      const preco = parseImportPrice(value);
      if (Number.isNaN(preco)) {
        pushError(errors, `Pizzas: preço inválido (${nome} / ${tamName}).`);
        return;
      }
      precos[tamId] = preco;
      tamanhoIds.push(tamId);
    });
    if (!tamanhoIds.length) {
      pushError(errors, `Pizzas: sabor "${nome}" sem preços válidos.`);
      return;
    }
    const id = importUid('sab');
    saborNameToId.set(normName(nome), id);
    sabores.push({
      id,
      nome,
      descricao: String(rawSabor?.descricao || '').trim(),
      imagemUrl: '',
      tamanhoIds,
      precos,
      ativo: rawSabor?.ativo !== false,
      ordem: index,
    });
  });

  const categorias = [];
  const sourceCats = Array.isArray(module?.categorias) ? module.categorias : [];
  sourceCats.forEach((rawCat, index) => {
    const nome = String(rawCat?.nome || '').trim();
    if (!nome) {
      pushError(errors, `Pizzas: categoria pública #${index + 1} sem nome.`);
      return;
    }
    const saborIds = (Array.isArray(rawCat?.sabores) ? rawCat.sabores : [])
      .map((name) => saborNameToId.get(normName(name)))
      .filter(Boolean);
    const tamanhoIds = (Array.isArray(rawCat?.tamanhos) ? rawCat.tamanhos : [])
      .map((name) => tamNameToId.get(normName(name)))
      .filter(Boolean);

    if (!saborIds.length) {
      pushError(errors, `Pizzas: categoria "${nome}" sem sabores válidos.`);
      return;
    }
    if (!tamanhoIds.length) {
      pushError(errors, `Pizzas: categoria "${nome}" sem tamanhos válidos.`);
      return;
    }

    const minSabores = Math.min(4, Math.max(1, Number(rawCat?.minSabores || 1)));
    const maxSabores = Math.min(4, Math.max(minSabores, Number(rawCat?.maxSabores || minSabores)));

    categorias.push({
      id: importUid('cat'),
      nomePublico: nome,
      descricao: String(rawCat?.descricao || '').trim(),
      imagemUrl: '',
      ativo: rawCat?.ativo !== false,
      ordem: index,
      saborIds,
      tamanhoIds,
      minSabores,
      maxSabores,
      regraPreco: rawCat?.regraPreco === 'media' ? 'media' : 'mais_caro',
      permitirSaboresDuplicados: rawCat?.permitirSaboresDuplicados === true,
      adicionais: { categoriaIds: [], itemIds: [] },
      adicionaisConfig: { grupos: {} },
      pecaTambemIds: [],
      entregaRetirada: rawCat?.entregaRetirada !== false,
      mesaBalcao: rawCat?.mesaBalcao !== false,
    });
  });

  return normalizePizzaCardapio({ tamanhos, sabores, categorias });
}

function resolveAdicionalCategoryId(name, catMaps, errors, context) {
  const key = normName(name);
  for (const map of catMaps) {
    const id = map.get(key);
    if (id) return id;
  }
  pushError(errors, `Marmitas: categoria de adicional "${name}" não encontrada (${context}).`);
  return '';
}

function buildMarmitasModule(module, errors, warnings, adicionalCatMaps) {
  const grupos = [];
  const grupoNameToId = new Map();

  const sourceGrupos = Array.isArray(module?.grupos) ? module.grupos : [];
  sourceGrupos.forEach((rawGrupo, index) => {
    const nome = String(rawGrupo?.nome || '').trim();
    if (!nome) {
      pushError(errors, `Marmitas: grupo #${index + 1} sem nome.`);
      return;
    }
    const id = importUid('mgr');
    grupoNameToId.set(normName(nome), id);
    grupos.push({
      id,
      nome,
      ativo: rawGrupo?.ativo !== false,
      ordem: index,
    });
  });

  const marmitas = [];
  const sourceItens = Array.isArray(module?.itens) ? module.itens : [];
  sourceItens.forEach((rawItem, index) => {
    const nome = String(rawItem?.nome || '').trim();
    if (!nome) {
      pushError(errors, `Marmitas: item #${index + 1} sem nome.`);
      return;
    }
    const grupoId = grupoNameToId.get(normName(rawItem?.grupo || '')) || '';
    if (rawItem?.grupo && !grupoId) {
      pushError(errors, `Marmitas: grupo "${rawItem.grupo}" não encontrado para "${nome}".`);
      return;
    }

    const tamanhos = (Array.isArray(rawItem?.tamanhos) ? rawItem.tamanhos : []).map((rawTam, tamIndex) => {
      const tamNome = String(rawTam?.nome || '').trim() || `Tamanho ${tamIndex + 1}`;
      const preco = parseImportPrice(rawTam?.preco);
      if (Number.isNaN(preco)) {
        pushError(errors, `Marmitas: preço inválido em "${nome}" / ${tamNome}.`);
      }
      return {
        id: importUid('tam'),
        nome: tamNome,
        preco: Number.isNaN(preco) ? '' : preco,
        ativo: rawTam?.ativo !== false,
        ordem: tamIndex,
      };
    });

    const passos = (Array.isArray(rawItem?.passos) ? rawItem.passos : []).map((rawPasso, passoIndex) => {
      const titulo = String(rawPasso?.titulo || '').trim();
      const categoriaName = String(rawPasso?.categoriaAdicional || '').trim();
      const categoriaAdicionalId = categoriaName
        ? resolveAdicionalCategoryId(categoriaName, adicionalCatMaps, errors, `${nome} / ${titulo || `passo ${passoIndex + 1}`}`)
        : '';
      return {
        id: importUid('passo'),
        titulo,
        categoriaAdicionalId,
        itemIds: [],
        obrigatorio: rawPasso?.obrigatorio === true,
        min: Number(rawPasso?.min ?? (rawPasso?.obrigatorio ? 1 : 0)),
        max: Number(rawPasso?.max ?? 1),
        tipoSelecao: rawPasso?.tipoSelecao === 'multipla' ? 'multipla' : 'simples',
        ordem: passoIndex,
      };
    });

    marmitas.push(
      normalizeMarmita({
        id: importUid('marm'),
        ativo: rawItem?.ativo !== false,
        ordem: index,
        tagAdmin: String(rawItem?.tagAdmin || '').trim(),
        nomePublico: nome,
        descricao: String(rawItem?.descricao || '').trim(),
        imagemUrl: '',
        grupoId,
        diaSemana: normalizeDiaSemana(rawItem?.diaSemana),
        tamanhos: tamanhos.length ? tamanhos : undefined,
        passos,
        pecaTambemIds: [],
        vitrine: rawItem?.vitrine === true,
        entregaRetirada: rawItem?.entregaRetirada !== false,
        mesaBalcao: rawItem?.mesaBalcao !== false,
      })
    );
  });

  const config = normalizeMarmitaCardapio(module?.config);

  if (!grupos.length && marmitas.length) {
    pushWarning(warnings, 'Marmitas: nenhum grupo informado; itens ficarão sem grupo.');
  }

  return { grupos, marmitas, config };
}

function mergeCategories(existing, incoming, { isProdutos = false } = {}) {
  const byName = new Map(existing.map((cat) => [normName(cat.nome), cat]));
  const next = [...existing];
  incoming.forEach((cat) => {
    const key = normName(cat.nome);
    if (byName.has(key)) return;
    byName.set(key, cat);
    next.push(cat);
  });
  return next;
}

function mergeItems(existing, incoming, mode) {
  if (mode === 'replace') return incoming;
  const byKey = new Map(
    existing.map((item) => [`${item.categoriaId}::${normName(item.nome)}`, item])
  );
  const next = [...existing];
  incoming.forEach((item) => {
    const key = `${item.categoriaId}::${normName(item.nome)}`;
    const found = byKey.get(key);
    if (found) {
      const idx = next.findIndex((row) => row.id === found.id);
      if (idx >= 0) next[idx] = { ...found, ...item, id: found.id, ordem: found.ordem };
      return;
    }
    byKey.set(key, item);
    next.push(item);
  });
  return next;
}

function remapIncomingCategories(incomingCats, existingCats) {
  const existingByName = new Map(existingCats.map((cat) => [normName(cat.nome), cat]));
  const idMap = new Map();
  const nextCats = [];

  incomingCats.forEach((cat) => {
    const existing = existingByName.get(normName(cat.nome));
    if (existing) {
      idMap.set(cat.id, existing.id);
      return;
    }
    nextCats.push(cat);
    idMap.set(cat.id, cat.id);
  });

  return { nextCats, idMap };
}

function applyItemsWithCategoryRemap(items, idMap) {
  return items.map((item) => ({
    ...item,
    categoriaId: idMap.get(item.categoriaId) || item.categoriaId,
  }));
}

export function buildFriendlyCatalogExport(storeData, { slug = '' } = {}) {
  const data = withDerivedData(storeData || {});
  const tamIdToName = new Map((data.pizzaCardapio?.tamanhos || []).map((tam) => [tam.id, tam.nome]));
  const saborIdToName = new Map((data.pizzaCardapio?.sabores || []).map((sab) => [sab.id, sab.nome]));
  const grupoIdToName = new Map((data.marmitaGrupos || []).map((grupo) => [grupo.id, grupo.nome]));
  const adicionalCatIdToName = new Map(
    (data.adicionaisCategorias || []).map((cat) => [cat.id, cat.nome])
  );

  const modules = {};

  if (data.adicionaisCategorias?.length || data.adicionaisItens?.length) {
    modules.adicionais = {
      categorias: (data.adicionaisCategorias || []).map((cat) => ({
        nome: cat.nome,
        obrigatorio: cat.obrigatorio === true,
        min: cat.min ?? 0,
        max: cat.max ?? 99,
        tipoSelecao: cat.tipoSelecao === 'simples' ? 'simples' : 'multipla',
        ativo: cat.ativo !== false,
        itens: (data.adicionaisItens || [])
          .filter((item) => item.categoriaId === cat.id)
          .map((item) => ({
            nome: item.nome,
            preco: item.preco ?? 0,
            descricao: item.descricao || '',
            codigoPdv: item.codigoPdv || '',
            ativo: item.ativo !== false,
          })),
      })),
    };
  }

  if (data.categorias?.length || data.produtos?.length) {
    modules.produtos = {
      categorias: (data.categorias || []).map((cat) => ({
        nome: cat.nome,
        icone: cat.icone || 'burger',
        ativo: cat.ativo !== false,
        itens: (data.produtos || [])
          .filter((item) => item.categoriaId === cat.id)
          .map((item) => ({
            nome: item.nome,
            preco: item.preco ?? 0,
            descricao: item.descricao || '',
            codigoPdv: item.codigoPdv || '',
            tipo: item.tipo === 'combo' ? 'combo' : 'comum',
            medida: item.medida || '',
            servePessoas: item.servePessoas || '',
            ativo: item.ativo !== false,
          })),
      })),
    };
  }

  if (data.pizzaCardapio?.tamanhos?.length) {
    modules.pizzas = {
      tamanhos: (data.pizzaCardapio.tamanhos || []).map((tam) => ({
        nome: tam.nome,
        descricaoFatias: tam.descricaoFatias || '',
        ativo: tam.ativo !== false,
      })),
      sabores: (data.pizzaCardapio.sabores || []).map((sabor) => ({
        nome: sabor.nome,
        descricao: sabor.descricao || '',
        ativo: sabor.ativo !== false,
        precos: Object.fromEntries(
          Object.entries(sabor.precos || {}).map(([tamId, value]) => [
            tamIdToName.get(tamId) || tamId,
            value,
          ])
        ),
      })),
      categorias: (data.pizzaCardapio.categorias || []).map((cat) => ({
        nome: cat.nomePublico,
        descricao: cat.descricao || '',
        sabores: (cat.saborIds || []).map((id) => saborIdToName.get(id) || id),
        tamanhos: (cat.tamanhoIds || []).map((id) => tamIdToName.get(id) || id),
        minSabores: cat.minSabores,
        maxSabores: cat.maxSabores,
        regraPreco: cat.regraPreco,
        ativo: cat.ativo !== false,
      })),
    };
  }

  if (data.marmitas?.length || data.marmitaGrupos?.length) {
    modules.marmitas = {
      grupos: (data.marmitaGrupos || []).map((grupo) => ({
        nome: grupo.nome,
        ativo: grupo.ativo !== false,
      })),
      itens: (data.marmitas || []).map((item) => ({
        grupo: grupoIdToName.get(item.grupoId) || '',
        nome: item.nomePublico || item.tagAdmin,
        diaSemana: item.diaSemana,
        descricao: item.descricao || '',
        tagAdmin: item.tagAdmin || '',
        ativo: item.ativo !== false,
        tamanhos: (item.tamanhos || []).map((tam) => ({
          nome: tam.nome,
          preco: tam.preco ?? 0,
          ativo: tam.ativo !== false,
        })),
        passos: (item.passos || []).map((passo) => ({
          titulo: passo.titulo,
          categoriaAdicional: adicionalCatIdToName.get(passo.categoriaAdicionalId) || '',
          obrigatorio: passo.obrigatorio === true,
          min: passo.min,
          max: passo.max,
          tipoSelecao: passo.tipoSelecao === 'multipla' ? 'multipla' : 'simples',
        })),
      })),
      config: data.marmitaCardapio || {},
    };
  }

  return {
    version: NIMBUS_CATALOG_IMPORT_VERSION,
    slug: slug || data.loja?.slug || '',
    notas: 'Exportado pelo Nimbus Super Admin. Referências por nome — seguro para edição manual ou conversão por agente.',
    modules: Object.keys(modules).length ? modules : emptyImportTemplate().modules,
  };
}

export function previewCatalogImport(payload, currentData = {}) {
  const result = applyCatalogImport(payload, currentData, { mode: 'replace', dryRun: true });
  return result.preview;
}

export function applyCatalogImport(payload, currentData = {}, { mode = 'replace', dryRun = false } = {}) {
  const errors = [];
  const warnings = [];
  const input = payload && typeof payload === 'object' ? payload : {};

  if (Number(input.version) !== NIMBUS_CATALOG_IMPORT_VERSION) {
    pushError(
      errors,
      `Versão inválida. Use version: ${NIMBUS_CATALOG_IMPORT_VERSION} no arquivo JSON.`
    );
  }

  const modules = input.modules && typeof input.modules === 'object' ? input.modules : {};
  const presentModules = MODULE_ORDER.filter((key) => modules[key] != null);
  if (!presentModules.length) {
    pushError(errors, 'Nenhum módulo encontrado em "modules".');
  }

  const base = withDerivedData(currentData || {});
  const built = {};

  if (modules.adicionais) {
    built.adicionais = buildAdicionaisModule(modules.adicionais, errors);
  }

  if (modules.produtos) {
    built.produtos = buildProdutosModule(modules.produtos, errors);
  }

  if (modules.pizzas) {
    built.pizzas = buildPizzasModule(modules.pizzas, errors, warnings);
  }

  const adicionalCatMaps = [];
  if (built.adicionais?.catNameToId) adicionalCatMaps.push(built.adicionais.catNameToId);
  adicionalCatMaps.push(
    new Map((base.adicionaisCategorias || []).map((cat) => [normName(cat.nome), cat.id]))
  );

  if (modules.marmitas) {
    built.marmitas = buildMarmitasModule(modules.marmitas, errors, warnings, adicionalCatMaps);
  }

  const counts = {
    adicionaisCategorias: 0,
    adicionaisItens: 0,
    categorias: 0,
    produtos: 0,
    pizzaTamanhos: 0,
    pizzaSabores: 0,
    pizzaCategorias: 0,
    marmitaGrupos: 0,
    marmitas: 0,
  };

  if (built.adicionais) {
    counts.adicionaisCategorias = built.adicionais.categorias.length;
    counts.adicionaisItens = built.adicionais.itens.length;
  }
  if (built.produtos) {
    counts.categorias = built.produtos.categorias.length;
    counts.produtos = built.produtos.produtos.length;
  }
  if (built.pizzas) {
    counts.pizzaTamanhos = built.pizzas.tamanhos.length;
    counts.pizzaSabores = built.pizzas.sabores.length;
    counts.pizzaCategorias = built.pizzas.categorias.length;
  }
  if (built.marmitas) {
    counts.marmitaGrupos = built.marmitas.grupos.length;
    counts.marmitas = built.marmitas.marmitas.length;
  }

  const preview = {
    slug: String(input.slug || base.loja?.slug || '').trim(),
    modules: presentModules,
    mode,
    counts,
    warnings,
    errors,
  };

  if (errors.length) {
    return { ok: false, preview, data: null };
  }

  if (dryRun) {
    return { ok: true, preview, data: null };
  }

  let next = { ...base };

  if (built.adicionais) {
    if (mode === 'replace') {
      next.adicionaisCategorias = built.adicionais.categorias;
      next.adicionaisItens = built.adicionais.itens;
    } else {
      const { nextCats, idMap } = remapIncomingCategories(
        built.adicionais.categorias,
        next.adicionaisCategorias || []
      );
      next.adicionaisCategorias = mergeCategories(next.adicionaisCategorias || [], nextCats);
      const remappedItems = applyItemsWithCategoryRemap(built.adicionais.itens, idMap);
      next.adicionaisItens = mergeItems(next.adicionaisItens || [], remappedItems, 'merge');
    }
  }

  if (built.produtos) {
    if (mode === 'replace') {
      next.categorias = built.produtos.categorias;
      next.produtos = built.produtos.produtos;
    } else {
      const { nextCats, idMap } = remapIncomingCategories(built.produtos.categorias, next.categorias || []);
      next.categorias = mergeCategories(next.categorias || [], nextCats, { isProdutos: true });
      const remappedItems = applyItemsWithCategoryRemap(built.produtos.produtos, idMap);
      next.produtos = mergeItems(next.produtos || [], remappedItems, 'merge');
    }
  }

  if (built.pizzas) {
    next.pizzaCardapio = built.pizzas;
  }

  if (built.marmitas) {
    if (mode === 'replace') {
      next.marmitaGrupos = built.marmitas.grupos;
      next.marmitas = built.marmitas.marmitas;
    } else {
      const grupoByName = new Map((next.marmitaGrupos || []).map((g) => [normName(g.nome), g]));
      const newGrupos = [];
      built.marmitas.grupos.forEach((grupo) => {
        if (!grupoByName.has(normName(grupo.nome))) {
          newGrupos.push(grupo);
          grupoByName.set(normName(grupo.nome), grupo);
        }
      });
      next.marmitaGrupos = [...(next.marmitaGrupos || []), ...newGrupos];
      const grupoIdMap = new Map();
      built.marmitas.grupos.forEach((grupo) => {
        const existing = grupoByName.get(normName(grupo.nome));
        if (existing) grupoIdMap.set(grupo.id, existing.id);
      });
      const remappedMarmitas = built.marmitas.marmitas.map((item) => ({
        ...item,
        grupoId: grupoIdMap.get(item.grupoId) || item.grupoId,
      }));
      next.marmitas = mergeItems(next.marmitas || [], remappedMarmitas, 'merge');
    }
    next.marmitaCardapio = built.marmitas.config;
  }

  const stamped = stampStoreMeta(withDerivedData(next));
  return { ok: true, preview, data: stamped };
}

export function getCatalogImportTemplate({ slug = '' } = {}) {
  const template = emptyImportTemplate();
  template.slug = slug;
  template.notas =
    'Modelo Nimbus v1. Remova módulos que não se aplicam à loja. Importe adicionais antes de marmitas.';
  return template;
}
