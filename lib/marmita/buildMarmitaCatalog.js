import { resolveAddonItemPrice } from '@/lib/addonPricing';
import { DEFAULT_STORE_TIMEZONE } from '@/lib/storeHours';
import { normalizePecaTambemIds } from '@/lib/productSuggestions';
import { buildMarmitaProductId } from '@/lib/marmita/marmitaIds';
import { MARMITA_CATEGORY_NAME, MARMITA_VIRTUAL_CATEGORY_ID } from '@/lib/marmita/marmitaCardapio';
import { normalizeMarmita } from '@/lib/marmita/marmitaModel';
import {
  getHiddenItemIdsForDate,
  selectMarmitasForPublicDate,
} from '@/lib/marmita/marmitaPublic';

function getPassoRule(passo, marmita, category) {
  const groupOverride = marmita.passosConfig?.grupos?.[passo.categoriaAdicionalId] || {};
  const tipoSelecao =
    groupOverride.tipoSelecao || passo.tipoSelecao || category?.tipoSelecao || 'simples';
  const min = Number(groupOverride.min ?? passo.min ?? category?.min ?? (passo.obrigatorio ? 1 : 0));
  let max = Number(groupOverride.max ?? passo.max ?? category?.max ?? 1);
  if (tipoSelecao === 'simples') max = 1;

  return {
    tipoSelecao,
    min,
    max: Math.max(1, max),
    obrigatorio: groupOverride.obrigatorio ?? passo.obrigatorio ?? category?.obrigatorio ?? false,
    itens: groupOverride.itens || {},
  };
}

/** Monta seções de adicionais a partir dos passos configurados na marmita. */
export function buildMarmitaAddonSections(parsed, rawMarmita) {
  const marmita = normalizeMarmita(rawMarmita);
  const activeAddons = (parsed.adicionaisItens || []).filter((item) => item.ativo !== false);
  const addonByCategory = new Map();
  activeAddons.forEach((item) => {
    if (!addonByCategory.has(item.categoriaId)) addonByCategory.set(item.categoriaId, []);
    addonByCategory.get(item.categoriaId).push(item);
  });

  const config = { grupos: marmita.passosConfig?.grupos || {} };
  const sections = [];

  marmita.passos.forEach((passo) => {
    const categoryId = passo.categoriaAdicionalId;
    if (!categoryId) return;

    const category = (parsed.adicionaisCategorias || []).find(
      (cat) => cat.id === categoryId && cat.ativo !== false
    );
    if (!category) return;

    const rule = getPassoRule(passo, marmita, category);
    let categoryItems = addonByCategory.get(categoryId) || [];
    if (Array.isArray(passo.itemIds) && passo.itemIds.length) {
      const allowed = new Set(passo.itemIds);
      categoryItems = categoryItems.filter((item) => allowed.has(item.id));
    }

    const items = categoryItems
      .filter((item) => !hiddenIds.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.nome,
        desc: item.descricao || '',
        extra: resolveAddonItemPrice(item, config, categoryId),
        imageUrl: item.imagemUrl || '',
      }));

    if (!items.length) return;

    sections.push({
      section: passo.titulo || category.nome,
      stepTitle: passo.titulo || category.nome,
      required: rule.obrigatorio === true,
      min: rule.min,
      max: rule.max,
      tipoSelecao: rule.tipoSelecao,
      items,
    });
  });

  return sections;
}

/** Expande cada marmita ativa em um card público por tamanho ativo. */
export function expandMarmitasToProducts(parsed, { date = new Date(), timeZone = DEFAULT_STORE_TIMEZONE } = {}) {
  const selection = selectMarmitasForPublicDate(parsed.marmitas, { date, timeZone });
  const products = [];

  selection.marmitas.forEach((rawMarmita) => {
    const marmita = normalizeMarmita(rawMarmita);
    if (!marmita.nomePublico) return;

    const addons = buildMarmitaAddonSections(parsed, marmita, { date, timeZone });

    marmita.tamanhos
      .filter((tam) => tam.ativo !== false)
      .forEach((tamanho) => {
        const price = Number(String(tamanho.preco ?? '').replace(',', '.')) || 0;
        products.push({
          id: buildMarmitaProductId(marmita.id, tamanho.id),
          marmitaId: marmita.id,
          tamanhoId: tamanho.id,
          category: MARMITA_CATEGORY_NAME,
          categoryId: MARMITA_VIRTUAL_CATEGORY_ID,
          categoryOrder: 0,
          marmitaOrdem: marmita.ordem ?? 0,
          tamanhoOrdem: tamanho.ordem ?? 0,
          name: `${marmita.nomePublico} — ${tamanho.nome}`,
          desc: marmita.descricao || '',
          price,
          imageUrl: marmita.imagemUrl || '',
          type: 'marmita',
          isMarmitaVitrine: selection.isVitrine,
          marmitaConfig: {
            marmitaId: marmita.id,
            nomePublico: marmita.nomePublico,
            tagAdmin: marmita.tagAdmin,
            diaSemana: marmita.diaSemana,
            passos: marmita.passos,
            passosConfig: marmita.passosConfig,
          },
          tamanhoSelecionado: {
            id: tamanho.id,
            nome: tamanho.nome,
            preco: price,
          },
          addons,
          relatedProductIds: normalizePecaTambemIds(marmita.pecaTambemIds),
        });
      });
  });

  return products.sort((a, b) => {
    const marmCmp = (a.marmitaOrdem ?? 0) - (b.marmitaOrdem ?? 0);
    if (marmCmp !== 0) return marmCmp;
    return (a.tamanhoOrdem ?? 0) - (b.tamanhoOrdem ?? 0);
  });
}
