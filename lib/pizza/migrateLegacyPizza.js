import { pizzaUid } from '@/lib/pizza/pizzaIds';
import {
  defaultPizzaTamanhos,
  emptyPizzaCardapio,
  normalizePizzaCardapio,
  normalizePizzaCategoria,
  normalizePizzaSabor,
  normalizePizzaTamanho,
} from '@/lib/pizza/pizzaModel';

function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(
    String(value || '')
      .replace(/\s/g, '')
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortByOrdem(list) {
  return [...list].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

function isFlavorCategory(category) {
  const nome = String(category?.nome || '')
    .trim()
    .toLowerCase();
  return nome === 'sabor' || nome.includes('sabor');
}

function mergeTamanhos(existing, incoming) {
  const byId = new Map(existing.map((item) => [item.id, item]));
  incoming.forEach((tam) => {
    const normalized = normalizePizzaTamanho(tam, byId.size);
    if (!byId.has(normalized.id)) {
      byId.set(normalized.id, normalized);
    }
  });
  return sortByOrdem([...byId.values()]);
}

function mergeSabores(existing, incoming) {
  const byId = new Map(existing.map((item) => [item.id, item]));
  incoming.forEach((sabor) => {
    const normalized = normalizePizzaSabor(sabor, byId.size);
    const prev = byId.get(normalized.id);
    if (!prev) {
      byId.set(normalized.id, normalized);
      return;
    }
    const tamanhoIds = new Set([...(prev.tamanhoIds || []), ...(normalized.tamanhoIds || [])]);
    byId.set(normalized.id, {
      ...prev,
      ...normalized,
      tamanhoIds: [...tamanhoIds],
      precos: { ...prev.precos, ...normalized.precos },
    });
  });
  return sortByOrdem([...byId.values()]);
}

/** Converte pizzas monolíticas (formato antigo) para pizzaCardapio. */
export function migratePizzasArrayToCardapio(pizzas = []) {
  const list = Array.isArray(pizzas) ? pizzas : [];
  if (!list.length) return emptyPizzaCardapio();

  let tamanhos = defaultPizzaTamanhos();
  let sabores = [];
  const categorias = [];

  list.forEach((rawPizza, index) => {
    const pizza = rawPizza && typeof rawPizza === 'object' ? rawPizza : {};
    const pizzaTamanhos = Array.isArray(pizza.tamanhos) && pizza.tamanhos.length ? pizza.tamanhos : defaultPizzaTamanhos();
    tamanhos = mergeTamanhos(
      tamanhos,
      pizzaTamanhos.map((tam, tamIndex) =>
        normalizePizzaTamanho(
          {
            id: tam.id || pizzaUid('tam'),
            nome: tam.nome,
            descricaoFatias: tam.descricaoFatias,
            ativo: tam.ativo,
            ordem: tam.ordem ?? tamIndex,
          },
          tamIndex
        )
      )
    );

    const tamanhoIds = pizzaTamanhos.map((tam) => tam.id).filter(Boolean);
    const pizzaSabores = (Array.isArray(pizza.sabores) ? pizza.sabores : []).map((sabor, saborIndex) => {
      const precos = sabor.precos && typeof sabor.precos === 'object' ? sabor.precos : {};
      const activeTamanhoIds = tamanhoIds.filter((tamId) => parseMoney(precos[tamId]) > 0);
      return normalizePizzaSabor(
        {
          id: sabor.id || pizzaUid('sab'),
          nome: sabor.nome,
          descricao: sabor.descricao,
          imagemUrl: sabor.imagemUrl,
          tamanhoIds: activeTamanhoIds.length ? activeTamanhoIds : tamanhoIds,
          precos,
          ativo: sabor.ativo,
          ordem: sabor.ordem ?? saborIndex,
        },
        saborIndex,
        tamanhoIds
      );
    });
    sabores = mergeSabores(sabores, pizzaSabores);

    const maxFromTamanhos = Math.max(
      1,
      ...pizzaTamanhos.map((tam) => Number(tam.maxSabores || pizza.maxSabores || 1))
    );

    categorias.push(
      normalizePizzaCategoria(
        {
          id: pizza.id || pizzaUid('cat'),
          nomePublico: pizza.nomePublico || pizza.tagAdmin || `Pizza ${index + 1}`,
          descricao: pizza.descricao || '',
          imagemUrl: pizza.imagemUrl || '',
          ativo: pizza.ativo,
          ordem: pizza.ordem ?? index,
          saborIds: pizzaSabores.map((sabor) => sabor.id),
          tamanhoIds: tamanhoIds.length ? tamanhoIds : tamanhos.map((tam) => tam.id),
          minSabores: 1,
          maxSabores: maxFromTamanhos,
          regraPreco: pizza.regraPreco,
          permitirSaboresDuplicados: pizza.permitirSaboresDuplicados,
          adicionais: pizza.adicionais,
          adicionaisConfig: pizza.adicionaisConfig,
          pecaTambemIds: pizza.pecaTambemIds,
          entregaRetirada: pizza.entregaRetirada,
          mesaBalcao: pizza.mesaBalcao,
        },
        index
      )
    );
  });

  return normalizePizzaCardapio({ tamanhos, sabores, categorias });
}

/** Importa cadastro legado em produtos/adicionais quando ainda não há pizzaCardapio. */
export function migrateLegacyPizzasIfNeeded(parsed) {
  const sizeProducts = (parsed?.produtos || []).filter((item) => item.tipo === 'tamanho_pizza');
  const pizzaProducts = (parsed?.produtos || []).filter(
    (item) => item.tipo === 'pizza' || item.tags?.includes('pizza')
  );
  if (!sizeProducts.length && !pizzaProducts.length) return [];

  const sourcePizza = pizzaProducts[0];
  const tamanhoConfig = sourcePizza?.pizzaConfig?.tamanhoConfig || [];
  const tamanhos = (tamanhoConfig.length ? tamanhoConfig : sizeProducts).map((item, index) => {
    const sizeProduct = sizeProducts.find((row) => row.id === item.tamanhoId) || sizeProducts[index];
    return {
      id: item.tamanhoId || sizeProduct?.id || pizzaUid('tam'),
      nome: sizeProduct?.nome || item.tamanhoNome || `Tamanho ${index + 1}`,
      descricaoFatias: '',
      maxSabores: Number(item.maxSabores || 1),
      ativo: item.ativo !== false,
      ordem: index,
    };
  });

  const flavorCategories = (parsed.adicionaisCategorias || []).filter(isFlavorCategory);
  const flavorCategoryIds = new Set(flavorCategories.map((cat) => cat.id));
  const flavorItems = (parsed.adicionaisItens || []).filter((item) => flavorCategoryIds.has(item.categoriaId));
  const selectedFlavorIds = sourcePizza?.pizzaConfig?.saboresSelecionados || flavorItems.map((item) => item.id);
  const matrix = sourcePizza?.pizzaConfig?.precoPorTamanhoSabor || {};

  const sabores = flavorItems
    .filter((item) => selectedFlavorIds.includes(item.id))
    .map((item, index) => {
      const precos = {};
      const activeTamanhoIds = [];
      tamanhos.forEach((tamanho) => {
        const key = `${item.id}:${tamanho.id}`;
        const override = matrix[key];
        const sizeBase = parseMoney(sizeProducts.find((row) => row.id === tamanho.id)?.preco);
        const flavorBase = parseMoney(item.preco);
        const combined =
          parseMoney(override) || (sizeBase + flavorBase > 0 ? sizeBase + flavorBase : flavorBase);
        if (combined > 0) {
          precos[tamanho.id] = combined;
          activeTamanhoIds.push(tamanho.id);
        }
      });
      return normalizePizzaSabor(
        {
          id: item.id,
          nome: item.nome,
          descricao: item.descricao || '',
          imagemUrl: item.imagemUrl || '',
          tamanhoIds: activeTamanhoIds,
          precos,
          ativo: item.ativo !== false,
          ordem: index,
        },
        index,
        tamanhos.map((tam) => tam.id)
      );
    });

  const pizza = {
    id: pizzaUid('piz'),
    nomePublico: sourcePizza?.nome || 'Monte sua pizza',
    descricao: sourcePizza?.descricao || '',
    imagemUrl: sourcePizza?.imagemUrl || '',
    ativo: sourcePizza?.ativo !== false,
    tamanhos,
    sabores,
    regraPreco: sourcePizza?.pizzaConfig?.regraPreco === 'media' ? 'media' : 'mais_caro',
    permitirSaboresDuplicados: sourcePizza?.pizzaConfig?.permitirSaboresDuplicados === true,
    adicionais: sourcePizza?.adicionais || { categoriaIds: [], itemIds: [] },
    adicionaisConfig: sourcePizza?.adicionaisConfig || { grupos: {} },
  };

  return [pizza];
}

/** @deprecated */
export function migrateLegacyPizzaIfNeeded(parsed) {
  const pizzas = migrateLegacyPizzasIfNeeded(parsed);
  if (pizzas.length) return pizzas[0];
  return null;
}
