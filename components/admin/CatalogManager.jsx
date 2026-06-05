'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import { uploadMenuAssetIfNeeded } from '@/lib/upload/menuAsset';
import { isPizzariaSegment } from '@/lib/empresaSegmentos';
import ImagePlaceholder from './ImagePlaceholder';
import AdminIcon from './AdminIcon';
import CategoryIcon from './CategoryIcon';
import { CATEGORY_ICONS } from '@/lib/categoryIcons';
import {
  COMBO_SUGGESTED_DISCOUNT_PERCENT,
  formatComboPriceBr,
  MAX_PECA_TAMBEM,
  normalizePecaTambemIds,
  suggestedComboPrice,
} from '@/lib/productSuggestions';

const TAB_ALL = 'all';

const EMPTY_SELECTION = {
  categoriaIds: [],
  itemIds: [],
};

const EMPTY_PIZZA_CONFIG = {
  tamanhoConfig: [],
  saboresSelecionados: [],
  precoPorTamanhoSabor: {},
  regraPreco: 'mais_caro',
  permitirSaboresDuplicados: false,
};

const EMPTY_COMBO_CONFIG = {
  itens: [],
  precoCombo: '',
};

const EMPTY_ADDON_RULES = {
  grupos: {},
};

const EMPTY_FORM = {
  tipo: 'comum',
  nome: '',
  codigoPdv: '',
  categoriaId: '',
  preco: '',
  pecaTambemIds: [],
  medidaQtd: '',
  medidaUn: 'un',
  servePessoas: '',
  estoque: '',
  descricao: '',
  disponivel: true,
  entregaRetirada: true,
  mesaBalcao: true,
  ingredientesRemoviveis: true,
  adicionaisHabilitados: true,
  remocoes: EMPTY_SELECTION,
  adicionais: EMPTY_SELECTION,
  adicionaisConfig: EMPTY_ADDON_RULES,
  pizzaConfig: EMPTY_PIZZA_CONFIG,
  comboConfig: EMPTY_COMBO_CONFIG,
};

const MAX_IMAGE_SIZE = 900;
const IMAGE_QUALITY = 0.72;
const MAX_STORED_IMAGE_LENGTH = 280000;

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function duplicateCopyLabel(nome) {
  const base = String(nome || '').trim() || 'Item';
  return `${base} (cópia)`;
}

function cloneItemForDuplicate(item, { newCategoryId, ordem, isProdutos }) {
  const copy = JSON.parse(JSON.stringify(item));
  return {
    ...copy,
    id: uid(isProdutos ? 'prod' : 'add-item'),
    categoriaId: newCategoryId,
    nome: duplicateCopyLabel(item.nome),
    ordem,
  };
}

function reorderByDrag(list, fromId, toId) {
  const fromIdx = list.findIndex((x) => x.id === fromId);
  const toIdx = list.findIndex((x) => x.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return list;
  const next = [...list];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next.map((item, idx) => ({ ...item, ordem: idx }));
}

function parseMoney(value) {
  if (typeof value === 'number') return value;
  const normalized = String(value || '')
    .replace(/\s/g, '')
    .replace('R$', '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function moneyInput(value) {
  if (value === undefined || value === null || value === '') return '';
  return String(value).replace('.', ',');
}

function selectionFrom(value) {
  return {
    categoriaIds: Array.isArray(value?.categoriaIds) ? value.categoriaIds : [],
    itemIds: Array.isArray(value?.itemIds) ? value.itemIds : [],
  };
}

function normalizePizzaConfig(value) {
  return {
    tamanhoConfig: Array.isArray(value?.tamanhoConfig) ? value.tamanhoConfig : [],
    saboresSelecionados: Array.isArray(value?.saboresSelecionados) ? value.saboresSelecionados : [],
    precoPorTamanhoSabor:
      value?.precoPorTamanhoSabor && typeof value.precoPorTamanhoSabor === 'object'
        ? value.precoPorTamanhoSabor
        : {},
    regraPreco: value?.regraPreco === 'media' ? 'media' : 'mais_caro',
    permitirSaboresDuplicados: value?.permitirSaboresDuplicados === true,
  };
}

function normalizeComboConfig(value) {
  return {
    itens: Array.isArray(value?.itens) ? value.itens : [],
    precoCombo: value?.precoCombo ?? '',
  };
}

function normalizeAddonRules(value) {
  return {
    grupos: value?.grupos && typeof value.grupos === 'object' ? value.grupos : {},
  };
}

function isFlavorCategory(category) {
  const nome = String(category?.nome || '')
    .trim()
    .toLowerCase();
  return nome === 'sabor' || nome.includes('sabor');
}

function getPizzaFromPrice(form, tamanhoProdutos, sabores) {
  if (form.tipo !== 'pizza') return parseMoney(form.preco);
  const config = normalizePizzaConfig(form.pizzaConfig);
  const enabledSizes = config.tamanhoConfig.filter((t) => t.ativo !== false);
  if (!enabledSizes.length || !config.saboresSelecionados.length) return NaN;

  const minSizePrice = Math.min(
    ...enabledSizes.map((sizeCfg) => {
      const size = tamanhoProdutos.find((item) => item.id === sizeCfg.tamanhoId);
      return Number(size?.preco || 0);
    })
  );

  const minFlavorPrice = Math.min(
    ...config.saboresSelecionados.map((saborId) => {
      const sabor = sabores.find((item) => item.id === saborId);
      return Number(sabor?.preco || 0);
    })
  );

  return minSizePrice + minFlavorPrice;
}

function splitMeasure(measure = '') {
  const [qtd, ...unitParts] = String(measure).trim().split(' ');
  return {
    medidaQtd: qtd || '',
    medidaUn: unitParts.join(' ') || 'un',
  };
}

function itemToForm(item, fallbackCategoryId) {
  const measure = splitMeasure(item.medida);
  return {
    ...EMPTY_FORM,
    tipo: item.tipo || (item.tags?.includes('pizza') ? 'pizza' : item.tags?.includes('combo') ? 'combo' : 'comum'),
    nome: item.nome || '',
    codigoPdv: item.codigoPdv || '',
    categoriaId: item.categoriaId || fallbackCategoryId || '',
    preco: moneyInput(item.preco),
    pecaTambemIds: normalizePecaTambemIds(item.pecaTambemIds),
    medidaQtd: measure.medidaQtd,
    medidaUn: measure.medidaUn,
    servePessoas: item.servePessoas || '',
    estoque: item.estoque || '',
    descricao: item.descricao || '',
    disponivel: item.ativo !== false,
    entregaRetirada: item.entregaRetirada !== false,
    mesaBalcao: item.mesaBalcao !== false,
    ingredientesRemoviveis: item.ingredientesRemoviveis !== false,
    adicionaisHabilitados: item.adicionaisHabilitados !== false,
    remocoes: selectionFrom(item.remocoes),
    adicionais: selectionFrom(item.adicionais),
    adicionaisConfig: normalizeAddonRules(item.adicionaisConfig),
    pizzaConfig: normalizePizzaConfig(item.pizzaConfig),
    comboConfig: normalizeComboConfig(item.comboConfig),
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function compressImageDataUrl(dataUrl) {
  if (!dataUrl?.startsWith('data:image/')) return dataUrl || '';
  if (dataUrl.length <= MAX_STORED_IMAGE_LENGTH) return dataUrl;

  const image = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return '';
  context.drawImage(image, 0, 0, width, height);

  let quality = IMAGE_QUALITY;
  let compressed = canvas.toDataURL('image/jpeg', quality);
  while (compressed.length > MAX_STORED_IMAGE_LENGTH && quality > 0.42) {
    quality -= 0.1;
    compressed = canvas.toDataURL('image/jpeg', quality);
  }
  return compressed;
}

async function compressImageFile(file) {
  const dataUrl = await readFileAsDataUrl(file);
  return compressImageDataUrl(dataUrl);
}

async function persistImageUrl(slug, dataUrl, folder) {
  const compressed = await compressImageDataUrl(dataUrl);
  if (!slug) return compressed;
  try {
    return await uploadMenuAssetIfNeeded(slug, compressed, { folder });
  } catch {
    return compressed;
  }
}

async function compactAdminDataImages(data, slug) {
  async function compactItems(items = [], folder) {
    return Promise.all(
      items.map(async (item) => ({
        ...item,
        imagemUrl: await persistImageUrl(slug, item.imagemUrl, folder),
      }))
    );
  }

  return {
    ...data,
    loja: {
      ...data.loja,
      logoUrl: await persistImageUrl(slug, data.loja?.logoUrl, 'loja'),
      capaUrl: await persistImageUrl(slug, data.loja?.capaUrl, 'loja'),
    },
    produtos: await compactItems(data.produtos, 'produtos'),
    adicionaisItens: await compactItems(data.adicionaisItens, 'adicionais'),
  };
}

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`admin-switch-button ${checked ? 'checked' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export default function CatalogManager({ mode = 'produtos' }) {
  const isProdutos = mode === 'produtos';
  const catKey = isProdutos ? 'categorias' : 'adicionaisCategorias';
  const itemKey = isProdutos ? 'produtos' : 'adicionaisItens';

  const { data, saveData, activeSlug } = useAdminData();
  const isPizzaria = isPizzariaSegment(data.loja?.segmento);
  const productTypeOptions = useMemo(
    () => (isPizzaria ? ['comum', 'combo', 'pizza'] : ['comum', 'combo']),
    [isPizzaria]
  );
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(TAB_ALL);
  const [ordering, setOrdering] = useState(false);
  const [orderOpenCat, setOrderOpenCat] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState('');
  const [categoryMenuId, setCategoryMenuId] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [removingCategory, setRemovingCategory] = useState(null);
  const [removingProduct, setRemovingProduct] = useState(null);
  const [duplicateCategoryTarget, setDuplicateCategoryTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formImage, setFormImage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [pickerType, setPickerType] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [comboPickerOpen, setComboPickerOpen] = useState(false);
  const [comboSearch, setComboSearch] = useState('');
  const [pecaTambemPickerOpen, setPecaTambemPickerOpen] = useState(false);
  const [pecaTambemSearch, setPecaTambemSearch] = useState('');

  const categories = useMemo(() => data[catKey] || [], [data, catKey]);
  const items = useMemo(() => data[itemKey] || [], [data, itemKey]);
  const addonCategories = useMemo(() => data.adicionaisCategorias || [], [data.adicionaisCategorias]);
  const addonItems = useMemo(() => data.adicionaisItens || [], [data.adicionaisItens]);
  const pizzaSizeProducts = useMemo(
    () => (data.produtos || []).filter((p) => p.tipo === 'tamanho_pizza' && p.ativo !== false),
    [data.produtos]
  );
  const flavorCategories = useMemo(
    () => addonCategories.filter((category) => isFlavorCategory(category) && category.ativo !== false),
    [addonCategories]
  );
  const flavorCategoryIds = useMemo(
    () => new Set(flavorCategories.map((category) => category.id)),
    [flavorCategories]
  );
  const flavorItems = useMemo(
    () => addonItems.filter((item) => flavorCategoryIds.has(item.categoriaId) && item.ativo !== false),
    [addonItems, flavorCategoryIds]
  );

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((cat) => cat.nome.toLowerCase().includes(q));
  }, [categories, search]);

  const visibleCategories = useMemo(() => {
    if (selectedCat === TAB_ALL) return filteredCategories;
    return filteredCategories.filter((c) => c.id === selectedCat);
  }, [filteredCategories, selectedCat]);

  const pickerSelection = pickerType ? form[pickerType] : EMPTY_SELECTION;
  const pickerTitle = pickerType === 'remocoes' ? 'Remocao de ingredientes' : 'Selecao de adicionais';
  const pizzaFromPrice = getPizzaFromPrice(form, pizzaSizeProducts, flavorItems);
  const selectedAddonGroups = useMemo(() => {
    const selected = selectionFrom(form.adicionais);
    const explicitCatIds = new Set(selected.categoriaIds);
    selected.itemIds.forEach((itemId) => {
      const item = addonItems.find((x) => x.id === itemId);
      if (item?.categoriaId) explicitCatIds.add(item.categoriaId);
    });
    return [...explicitCatIds]
      .map((catId) => {
        const cat = addonCategories.find((c) => c.id === catId);
        if (!cat) return null;
        const baseItems = addonItems.filter((item) => item.categoriaId === catId && item.ativo !== false);
        const items =
          selected.categoriaIds.includes(catId)
            ? baseItems
            : baseItems.filter((item) => selected.itemIds.includes(item.id));
        return { id: cat.id, nome: cat.nome, items };
      })
      .filter(Boolean);
  }, [form.adicionais, addonCategories, addonItems]);
  const productPickerCandidates = useMemo(
    () =>
      (data.produtos || []).filter(
        (p) =>
          p.ativo !== false &&
          p.tipo !== 'combo' &&
          p.tipo !== 'tamanho_pizza' &&
          p.id !== editingItemId
      ),
    [data.produtos, editingItemId]
  );
  const comboCandidates = productPickerCandidates;
  const pecaTambemCandidates = productPickerCandidates;
  const pecaTambemSelected = useMemo(
    () =>
      normalizePecaTambemIds(form.pecaTambemIds)
        .map((id) => (data.produtos || []).find((p) => p.id === id))
        .filter(Boolean),
    [form.pecaTambemIds, data.produtos]
  );

  function categoryItems(catId) {
    return items
      .filter((p) => p.categoriaId === catId)
      .filter((p) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return p.nome.toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q);
      });
  }

  function addCategory() {
    const nome = newCatName.trim();
    if (!nome) return;
    const baseCategory = {
      id: uid(isProdutos ? 'cat' : 'add-cat'),
      nome,
      ativo: true,
      ordem: data[catKey]?.length || 0,
    };
    const nextCategory = isProdutos
      ? { ...baseCategory, icone: 'burger' }
      : {
          ...baseCategory,
          obrigatorio: false,
          min: 0,
          max: 99,
          tipoSelecao: 'multipla',
        };
    saveData((prev) => ({
      ...prev,
      [catKey]: [...prev[catKey], nextCategory],
    }));
    setNewCatName('');
  }

  function openEditCategory(cat) {
    if (isProdutos) {
      setEditingCategory({ id: cat.id, nome: cat.nome, icone: cat.icone || 'burger' });
    } else {
      setEditingCategory({
        id: cat.id,
        nome: cat.nome,
        obrigatorio: cat.obrigatorio === true,
        min: cat.min ?? 0,
        max: cat.max ?? 99,
        tipoSelecao: cat.tipoSelecao === 'simples' ? 'simples' : 'multipla',
      });
    }
    setCategoryMenuId('');
  }

  function saveCategoryName() {
    const nome = editingCategory?.nome?.trim();
    if (!nome) return;
    saveData((prev) => ({
      ...prev,
      [catKey]: prev[catKey].map((cat) => {
        if (cat.id !== editingCategory.id) return cat;
        if (isProdutos) {
          return { ...cat, nome, icone: editingCategory.icone || cat.icone || 'burger' };
        }
        const min = Math.max(0, Number(editingCategory.min || 0));
        let max = Math.max(min, Number(editingCategory.max || min));
        if (editingCategory.tipoSelecao === 'simples') max = 1;
        return {
          ...cat,
          nome,
          obrigatorio: editingCategory.obrigatorio === true,
          min,
          max,
          tipoSelecao: editingCategory.tipoSelecao === 'simples' ? 'simples' : 'multipla',
        };
      }),
    }));
    setEditingCategory(null);
  }

  function confirmRemoveCategory() {
    if (!removingCategory) return;
    saveData((prev) => ({
      ...prev,
      [catKey]: prev[catKey].filter((cat) => cat.id !== removingCategory.id),
      [itemKey]: prev[itemKey].filter((item) => item.categoriaId !== removingCategory.id),
    }));
    if (selectedCat === removingCategory.id) setSelectedCat(TAB_ALL);
    setRemovingCategory(null);
  }

  function confirmRemoveProduct() {
    if (!removingProduct) return;
    saveData((prev) => ({
      ...prev,
      [itemKey]: prev[itemKey].filter((item) => item.id !== removingProduct.id),
    }));
    setRemovingProduct(null);
  }

  function duplicateItem(item, catId) {
    const catGroup = items.filter((x) => x.categoriaId === catId);
    const copy = cloneItemForDuplicate(item, {
      newCategoryId: catId,
      ordem: catGroup.length,
      isProdutos,
    });
    saveData((prev) => ({
      ...prev,
      [itemKey]: [...prev[itemKey], copy],
    }));
  }

  function confirmDuplicateCategory(includeProducts) {
    if (!duplicateCategoryTarget) return;
    const source = duplicateCategoryTarget;
    const newCatId = uid(isProdutos ? 'cat' : 'add-cat');
    saveData((prev) => {
      const nextCategory = {
        ...source,
        id: newCatId,
        nome: duplicateCopyLabel(source.nome),
        ordem: prev[catKey].length,
      };
      const sourceItems = prev[itemKey].filter((item) => item.categoriaId === source.id);
      const copiedItems = includeProducts
        ? sourceItems.map((item, idx) =>
            cloneItemForDuplicate(item, { newCategoryId: newCatId, ordem: idx, isProdutos })
          )
        : [];
      return {
        ...prev,
        [catKey]: [...prev[catKey], nextCategory],
        [itemKey]: includeProducts ? [...prev[itemKey], ...copiedItems] : prev[itemKey],
      };
    });
    setDuplicateCategoryTarget(null);
    setCategoryMenuId('');
  }

  function openNewItemModal(catId) {
    setEditingItemId('');
    setForm({ ...EMPTY_FORM, categoriaId: catId });
    setFormImage('');
    setSaveError('');
    setComboSearch('');
    setComboPickerOpen(false);
    setPecaTambemSearch('');
    setPecaTambemPickerOpen(false);
    setModalOpen(true);
  }

  function openEditItemModal(item) {
    setEditingItemId(item.id);
    setForm(itemToForm(item, item.categoriaId));
    setFormImage(item.imagemUrl || '');
    setSaveError('');
    setComboSearch('');
    setComboPickerOpen(false);
    setPecaTambemSearch('');
    setPecaTambemPickerOpen(false);
    setModalOpen(true);
  }

  function closeItemModal() {
    setModalOpen(false);
    setPickerType('');
    setPickerSearch('');
    setComboPickerOpen(false);
    setComboSearch('');
    setPecaTambemPickerOpen(false);
    setPecaTambemSearch('');
  }

  async function saveItem() {
    setSaveError('');
    const nome = form.nome.trim();
    const comboConfig = normalizeComboConfig(form.comboConfig);
    const comboPrice = parseMoney(comboConfig.precoCombo);
    const preco =
      form.tipo === 'combo'
        ? comboPrice
        : getPizzaFromPrice(form, pizzaSizeProducts, flavorItems);
    const pizzaConfig = normalizePizzaConfig(form.pizzaConfig);
    const enabledSizes = pizzaConfig.tamanhoConfig.filter((item) => item.ativo !== false);
    if (!nome || !form.categoriaId || Number.isNaN(preco)) return;
    if (form.tipo === 'pizza' && (!enabledSizes.length || !pizzaConfig.saboresSelecionados.length)) {
      setSaveError('Pizza precisa de ao menos 1 tamanho e 1 sabor selecionado.');
      return;
    }
    if (form.tipo === 'combo' && comboConfig.itens.length < 2) {
      setSaveError('Combo precisa ter pelo menos 2 produtos.');
      return;
    }
    const addonRules = normalizeAddonRules(form.adicionaisConfig);
    if (form.tipo !== 'combo') {
      for (const group of selectedAddonGroups) {
        const rule = addonRules.grupos[group.id];
        if (!rule) continue;
        const min = Number(rule.min || 0);
        const max = Number(rule.max || 0);
        const totalItens = group.items.length;
        if (min > max) {
          setSaveError(`No grupo "${group.nome}", o minimo nao pode ser maior que o maximo.`);
          return;
        }
        if (min > totalItens) {
          setSaveError(`No grupo "${group.nome}", o minimo nao pode ser maior que a quantidade de itens do grupo.`);
          return;
        }
      }
    }
    const imagemUrl = await persistImageUrl(activeSlug || data.loja?.slug, formImage, isProdutos ? 'produtos' : 'adicionais');

    const payload = {
      categoriaId: form.categoriaId,
      nome,
      descricao: form.descricao.trim(),
      preco,
      imagemUrl,
      ativo: form.disponivel,
      tags: form.tipo === 'pizza' ? ['pizza'] : form.tipo === 'combo' ? ['combo'] : [],
      tipo: form.tipo,
      codigoPdv: form.codigoPdv.trim(),
      pecaTambemIds: form.tipo === 'combo' ? [] : normalizePecaTambemIds(form.pecaTambemIds),
      medida: form.tipo === 'combo' ? '' : form.medidaQtd ? `${form.medidaQtd} ${form.medidaUn}` : '',
      servePessoas: form.servePessoas || '',
      estoque: form.estoque || '',
      entregaRetirada: form.entregaRetirada,
      mesaBalcao: form.mesaBalcao,
      ingredientesRemoviveis: form.tipo === 'pizza' || form.tipo === 'combo' ? false : form.ingredientesRemoviveis,
      adicionaisHabilitados: form.tipo === 'combo' ? false : form.adicionaisHabilitados,
      remocoes: form.tipo === 'pizza' || form.tipo === 'combo' ? EMPTY_SELECTION : selectionFrom(form.remocoes),
      adicionais: form.tipo === 'combo' ? EMPTY_SELECTION : selectionFrom(form.adicionais),
      adicionaisConfig: form.tipo === 'combo' ? EMPTY_ADDON_RULES : addonRules,
      pizzaConfig: form.tipo === 'pizza' ? pizzaConfig : undefined,
      precoDesde: form.tipo === 'pizza' ? preco : undefined,
      comboConfig:
        form.tipo === 'combo'
          ? {
              ...comboConfig,
              totalItens: comboTotals.totalItens,
              economia: comboTotals.totalItens - preco,
            }
          : undefined,
    };

    try {
      const storeSlug = activeSlug || data.loja?.slug || '';
      const compactData = await compactAdminDataImages(data, storeSlug);
      let nextItems;

      if (editingItemId) {
        nextItems = compactData[itemKey].map((item) =>
          item.id === editingItemId ? { ...item, ...payload } : item
        );
      } else {
        const catItems = compactData[itemKey].filter((x) => x.categoriaId === form.categoriaId);
        nextItems = [
          ...compactData[itemKey],
          {
            id: uid(isProdutos ? 'prod' : 'add-item'),
            ordem: catItems.length,
            ...payload,
          },
        ];
      }

      saveData({ ...compactData, [itemKey]: nextItems });
      closeItemModal();
    } catch (error) {
      setSaveError(
        error?.name === 'QuotaExceededError'
          ? 'Ainda nao foi possivel salvar porque o armazenamento local esta cheio. Remova fotos muito grandes de outros itens ou limpe dados antigos do cardapio.'
          : 'Nao foi possivel salvar agora. Tente novamente.'
      );
    }
  }

  function toggleSelection(target, id) {
    if (!pickerType) return;
    setForm((prev) => {
      const current = selectionFrom(prev[pickerType]);
      const key = target === 'categoria' ? 'categoriaIds' : 'itemIds';
      const has = current[key].includes(id);
      return {
        ...prev,
        [pickerType]: {
          ...current,
          [key]: has ? current[key].filter((x) => x !== id) : [...current[key], id],
        },
      };
    });
  }

  function countSelection(selection) {
    const safe = selectionFrom(selection);
    return safe.categoriaIds.length + safe.itemIds.length;
  }

  function filteredAddonItems(catId) {
    const q = pickerSearch.trim().toLowerCase();
    return addonItems
      .filter((item) => item.categoriaId === catId)
      .filter((item) => {
        if (!q) return true;
        return item.nome.toLowerCase().includes(q) || (item.descricao || '').toLowerCase().includes(q);
      });
  }

  function updatePizzaConfig(updater) {
    setForm((prev) => ({
      ...prev,
      pizzaConfig: updater(normalizePizzaConfig(prev.pizzaConfig)),
    }));
  }

  function togglePizzaSize(tamanhoId) {
    updatePizzaConfig((config) => {
      const exists = config.tamanhoConfig.find((item) => item.tamanhoId === tamanhoId);
      if (exists) {
        return {
          ...config,
          tamanhoConfig: config.tamanhoConfig.filter((item) => item.tamanhoId !== tamanhoId),
        };
      }
      return {
        ...config,
        tamanhoConfig: [...config.tamanhoConfig, { tamanhoId, maxSabores: 1, ativo: true }],
      };
    });
  }

  function setPizzaSizeMaxSabores(tamanhoId, maxSabores) {
    updatePizzaConfig((config) => ({
      ...config,
      tamanhoConfig: config.tamanhoConfig.map((item) =>
        item.tamanhoId === tamanhoId ? { ...item, maxSabores: Number(maxSabores) } : item
      ),
    }));
  }

  function togglePizzaFlavor(saborId) {
    updatePizzaConfig((config) => {
      const selected = config.saboresSelecionados.includes(saborId);
      return {
        ...config,
        saboresSelecionados: selected
          ? config.saboresSelecionados.filter((id) => id !== saborId)
          : [...config.saboresSelecionados, saborId],
      };
    });
  }

  function setAllPizzaFlavors(checked) {
    updatePizzaConfig((config) => ({
      ...config,
      saboresSelecionados: checked ? flavorItems.map((item) => item.id) : [],
    }));
  }

  function setPizzaFlavorSizePrice(saborId, tamanhoId, value) {
    updatePizzaConfig((config) => ({
      ...config,
      precoPorTamanhoSabor: {
        ...config.precoPorTamanhoSabor,
        [`${saborId}:${tamanhoId}`]: value,
      },
    }));
  }

  function updateAddonRules(updater) {
    setForm((prev) => ({
      ...prev,
      adicionaisConfig: updater(normalizeAddonRules(prev.adicionaisConfig)),
    }));
  }

  function getGroupRule(groupId) {
    const rules = normalizeAddonRules(form.adicionaisConfig);
    const category = addonCategories.find((cat) => cat.id === groupId);
    const defaults = {
      tipoSelecao: category?.tipoSelecao === 'simples' ? 'simples' : 'multipla',
      min: category?.min ?? 0,
      max: category?.max ?? 99,
      obrigatorio: category?.obrigatorio === true,
      itens: {},
    };
    return rules.grupos[groupId] ? { ...defaults, ...rules.grupos[groupId] } : defaults;
  }

  function setGroupRule(groupId, patch) {
    updateAddonRules((rules) => {
      const current = rules.grupos[groupId] || {
        tipoSelecao: 'multipla',
        min: 0,
        max: 99,
        obrigatorio: false,
        itens: {},
      };
      const next = { ...current, ...patch };
      if (next.tipoSelecao === 'simples') {
        next.min = Math.min(1, Math.max(0, Number(next.min || 0)));
        next.max = 1;
      }
      if (Number(next.min) > Number(next.max)) next.max = Number(next.min);
      if (Number(next.min) < 0) next.min = 0;
      return {
        ...rules,
        grupos: {
          ...rules.grupos,
          [groupId]: next,
        },
      };
    });
  }

  function setAddonItemRule(groupId, itemId, patch) {
    updateAddonRules((rules) => {
      const group = rules.grupos[groupId] || {
        tipoSelecao: 'multipla',
        min: 0,
        max: 99,
        obrigatorio: false,
        itens: {},
      };
      const currentItem = group.itens?.[itemId] || {
        precoAdicional: '',
        permiteQuantidade: 1,
        opcional: true,
      };
      return {
        ...rules,
        grupos: {
          ...rules.grupos,
          [groupId]: {
            ...group,
            itens: {
              ...(group.itens || {}),
              [itemId]: {
                ...currentItem,
                ...patch,
              },
            },
          },
        },
      };
    });
  }

  function duplicateGroupRules(fromGroupId, toGroupId) {
    if (!fromGroupId || !toGroupId || fromGroupId === toGroupId) return;
    updateAddonRules((rules) => {
      const source = rules.grupos[fromGroupId];
      if (!source) return rules;
      return {
        ...rules,
        grupos: {
          ...rules.grupos,
          [toGroupId]: JSON.parse(JSON.stringify(source)),
        },
      };
    });
  }

  function flavorPricePreview(saborId, tamanhoId) {
    const config = normalizePizzaConfig(form.pizzaConfig);
    const overrideRaw = config.precoPorTamanhoSabor[`${saborId}:${tamanhoId}`];
    const override = parseMoney(overrideRaw);
    if (!Number.isNaN(override)) return override;
    const flavor = flavorItems.find((item) => item.id === saborId);
    return Number(flavor?.preco || 0);
  }

  function updateComboConfig(updater) {
    setForm((prev) => ({
      ...prev,
      comboConfig: updater(normalizeComboConfig(prev.comboConfig)),
    }));
  }

  const comboTotals = (() => {
    const cfg = normalizeComboConfig(form.comboConfig);
    const totalItens = cfg.itens.reduce((sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 1), 0);
    const precoCombo = parseMoney(cfg.precoCombo);
    const sugestao = suggestedComboPrice(totalItens);
    const economia = Number.isNaN(precoCombo) ? totalItens - sugestao : totalItens - precoCombo;
    const descontoPercent =
      totalItens > 0 && !Number.isNaN(precoCombo)
        ? Math.round((economia / totalItens) * 1000) / 10
        : COMBO_SUGGESTED_DISCOUNT_PERCENT;
    return { totalItens, sugestao, economia, precoCombo, descontoPercent };
  })();

  function togglePecaTambem(produtoId) {
    setForm((prev) => {
      const current = normalizePecaTambemIds(prev.pecaTambemIds);
      if (current.includes(produtoId)) {
        return { ...prev, pecaTambemIds: current.filter((id) => id !== produtoId) };
      }
      if (current.length >= MAX_PECA_TAMBEM) {
        setSaveError(`Selecione no máximo ${MAX_PECA_TAMBEM} produtos em Peça também.`);
        return prev;
      }
      setSaveError('');
      return { ...prev, pecaTambemIds: [...current, produtoId] };
    });
  }

  function removePecaTambem(produtoId) {
    setForm((prev) => ({
      ...prev,
      pecaTambemIds: normalizePecaTambemIds(prev.pecaTambemIds).filter((id) => id !== produtoId),
    }));
  }

  function addProdutoToCombo(product) {
    updateComboConfig((cfg) => {
      if (cfg.itens.some((item) => item.produtoId === product.id)) return cfg;
      const nextItens = [
        ...cfg.itens,
        {
          produtoId: product.id,
          nome: product.nome,
          preco: Number(product.preco || 0),
          quantidade: 1,
        },
      ];
      const total = nextItens.reduce((sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 1), 0);
      return {
        ...cfg,
        itens: nextItens,
        precoCombo:
          cfg.precoCombo === '' || cfg.precoCombo === null || cfg.precoCombo === undefined
            ? formatComboPriceBr(suggestedComboPrice(total))
            : cfg.precoCombo,
      };
    });
  }

  function updateComboItemQty(produtoId, quantidade) {
    const qty = Math.max(1, Number(quantidade || 1));
    updateComboConfig((cfg) => ({
      ...cfg,
      itens: cfg.itens.map((item) => (item.produtoId === produtoId ? { ...item, quantidade: qty } : item)),
    }));
  }

  function removeComboItem(produtoId) {
    updateComboConfig((cfg) => ({
      ...cfg,
      itens: cfg.itens.filter((item) => item.produtoId !== produtoId),
    }));
  }

  function previewMeta() {
    const parts = [];
    if (form.medidaQtd) parts.push(`${form.medidaQtd} ${form.medidaUn}`);
    if (form.servePessoas) parts.push(`Serve ${form.servePessoas}`);
    return parts.join(' / ');
  }

  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page">
      <div className="admin-pedidos-search-row">
        <div className="admin-pedidos-search-wrap">
          <AdminIcon name="search" />
          <input
            className="admin-input admin-pedidos-search"
            placeholder={isProdutos ? 'Pesquisar por nome, descrição ou categoria...' : 'Pesquisar adicionais por nome ou descrição...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-catalog-top-row">
        <div className="admin-catalog-cats">
          <button type="button" className={`admin-catalog-cat-pill ${selectedCat === TAB_ALL ? 'active' : ''}`} onClick={() => setSelectedCat(TAB_ALL)}>
            Todos
          </button>
          {categories.map((cat) => (
            <button key={cat.id} type="button" className={`admin-catalog-cat-pill ${selectedCat === cat.id ? 'active' : ''}`} onClick={() => setSelectedCat(cat.id)}>
              {cat.nome}
            </button>
          ))}
        </div>
        <div className="admin-catalog-top-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setNewCatName((v) => (v ? '' : ' '))}>
            <AdminIcon name="plus" />
            Nova categoria
          </button>
          <button type="button" className="admin-catalog-order-btn" onClick={() => setOrdering((v) => !v)}>
            <AdminIcon name="sort" />
            {ordering ? 'Voltar' : 'Ordenar'}
          </button>
        </div>
      </div>

      {newCatName !== '' ? (
        <div className="admin-card admin-new-category-card">
          <input className="admin-input" placeholder={isProdutos ? 'Ex: Burgers artesanais' : 'Ex: Molhos extras'} value={newCatName === ' ' ? '' : newCatName} onChange={(e) => setNewCatName(e.target.value)} />
          <button type="button" className="admin-btn admin-btn-primary" onClick={addCategory}>Salvar</button>
        </div>
      ) : null}

      {ordering ? (
        <div className="admin-card">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="admin-order-row"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', cat.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData('text/plain');
                saveData((prev) => ({ ...prev, [catKey]: reorderByDrag(prev[catKey], fromId, cat.id) }));
              }}
            >
              <button type="button" className="admin-order-row-title" onClick={() => setOrderOpenCat((v) => (v === cat.id ? '' : cat.id))}>{cat.nome}</button>
              <span className="admin-order-hint">Arraste para ordenar</span>
            </div>
          ))}
          {orderOpenCat ? (
            <div className="admin-order-child-wrap">
              {categoryItems(orderOpenCat).map((item) => (
                <div
                  key={item.id}
                  className="admin-order-child-row"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const fromId = e.dataTransfer.getData('text/plain');
                    saveData((prev) => ({
                      ...prev,
                      [itemKey]: (() => {
                        const same = prev[itemKey].filter((x) => x.categoriaId === orderOpenCat);
                        const other = prev[itemKey].filter((x) => x.categoriaId !== orderOpenCat);
                        return [...other, ...reorderByDrag(same, fromId, item.id)];
                      })(),
                    }));
                  }}
                >
                  <span>{item.nome}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        visibleCategories.map((cat) => {
          const catItems = categoryItems(cat.id);
          return (
            <div key={cat.id} className="admin-card admin-catalog-card">
              <div className="admin-catalog-header-bar">
                <div className="admin-catalog-title-row">
                  <span className="admin-section-icon">
                    {isProdutos ? (
                      <CategoryIcon name={cat.icone || 'burger'} size={22} tinted />
                    ) : (
                      <AdminIcon name="category" />
                    )}
                  </span>
                  <h3>{cat.nome}</h3>
                  <span>Disponivel</span>
                  <Switch
                    checked={Boolean(cat.ativo)}
                    label={`Alterar disponibilidade da categoria ${cat.nome}`}
                    onChange={(checked) =>
                      saveData((prev) => ({
                        ...prev,
                        [catKey]: prev[catKey].map((c) => (c.id === cat.id ? { ...c, ativo: checked } : c)),
                      }))
                    }
                  />
                </div>
                <div className="admin-category-actions">
                  <button type="button" className="admin-btn admin-btn-ghost" onClick={() => openNewItemModal(cat.id)}>
                    <AdminIcon name="plus" />
                    Novo item
                  </button>
                  <div className="admin-category-menu-wrap">
                    <button
                      type="button"
                      className="admin-kebab-btn"
                      aria-label={`Opcoes da categoria ${cat.nome}`}
                      onClick={() => setCategoryMenuId((id) => (id === cat.id ? '' : cat.id))}
                    >
                      <span />
                      <span />
                      <span />
                    </button>
                    {categoryMenuId === cat.id ? (
                      <div className="admin-floating-menu">
                        {isProdutos ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryMenuId('');
                              setOrdering(true);
                              setOrderOpenCat(cat.id);
                            }}
                          >
                            Ordenar Produtos
                          </button>
                        ) : null}
                        <button type="button" onClick={() => openEditCategory(cat)}>Editar categoria</button>
                        <button
                          type="button"
                          onClick={() => {
                            setDuplicateCategoryTarget(cat);
                            setCategoryMenuId('');
                          }}
                        >
                          Duplicar categoria
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setRemovingCategory(cat);
                            setCategoryMenuId('');
                          }}
                        >
                          Remover categoria
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {catItems.length ? (
                catItems.map((item) => (
                  <div key={item.id} className="admin-catalog-item-row">
                    {item.imagemUrl ? (
                      <img className="admin-catalog-item-img" src={item.imagemUrl} alt="" />
                    ) : (
                      <ImagePlaceholder size={112} />
                    )}
                    <div className="admin-catalog-item-main">
                      <div className="admin-item-title">{item.nome}</div>
                      <div className="admin-item-desc">{item.descricao || '-'}</div>
                      <div className="admin-catalog-item-tags">
                        {item.medida ? <span>{item.medida}</span> : null}
                        {item.servePessoas ? <span>Serve {item.servePessoas}</span> : null}
                        {item.tipo ? <span>{item.tipo}</span> : null}
                      </div>
                      <div className="admin-order-price">R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}</div>
                    </div>
                    <div className="admin-item-actions-col">
                      <div className="admin-availability-cell">
                        <span>Disponivel</span>
                        <Switch
                          checked={Boolean(item.ativo)}
                          label={`Alterar disponibilidade de ${item.nome}`}
                          onChange={(checked) =>
                            saveData((prev) => ({
                              ...prev,
                              [itemKey]: prev[itemKey].map((p) => (p.id === item.id ? { ...p, ativo: checked } : p)),
                            }))
                          }
                        />
                      </div>
                      <button type="button" className="admin-link-btn" onClick={() => openEditItemModal(item)}>Editar</button>
                      <button type="button" className="admin-link-btn" onClick={() => duplicateItem(item, cat.id)}>
                        Duplicar
                      </button>
                      <button
                        type="button"
                        className="admin-link-btn"
                        style={{ color: 'var(--admin-danger, #dc2626)' }}
                        onClick={() => setRemovingProduct(item)}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="admin-empty-catalog">Nenhum item nesta categoria.</div>
              )}
            </div>
          );
        })
      )}

      {modalOpen ? (
        <div className="overlay open admin-item-overlay" onClick={closeItemModal}>
          <div className="product-popup admin-product-popup" onClick={(e) => e.stopPropagation()}>
            <div className="popup-details-col admin-item-form-col">
              <div className="popup-header admin-item-popup-header">
                <div className="admin-modal-title-row">
                  <span className="admin-section-icon">
                    <AdminIcon name={isProdutos ? 'burger' : 'category'} />
                  </span>
                  <div>
                    <div className="popup-header-title">{editingItemId ? 'Editando item' : 'Cadastrando novo item'}</div>
                    <div className="popup-header-desc">Configure o item como ele sera exibido no cardapio.</div>
                  </div>
                </div>
                <div className="admin-inline-switch">
                  <span>Disponivel</span>
                  <Switch checked={form.disponivel} label="Disponibilidade do item" onChange={(checked) => setForm((p) => ({ ...p, disponivel: checked }))} />
                </div>
              </div>
              <div className="popup-body admin-item-popup-body">
                {isProdutos ? (
                  <div className="admin-tabs admin-tabs-pedidos admin-product-type-tabs">
                    {productTypeOptions.map((t) => (
                      <button key={t} type="button" className={`admin-tab ${form.tipo === t ? 'active' : ''}`} onClick={() => setForm((p) => ({ ...p, tipo: t }))}>
                        {t === 'comum' ? 'Padrão' : t === 'pizza' ? 'Pizza' : 'Combo'}
                      </button>
                    ))}
                  </div>
                ) : null}

                {form.tipo === 'pizza' && isProdutos ? (
                  <div className="admin-info-note">
                    <span aria-hidden>i</span>
                    Este modo libera configuracoes avancadas para pizzas, como grupos de sabores e complementos.
                  </div>
                ) : null}
                {saveError ? <div className="admin-error">{saveError}</div> : null}

                <div className="admin-catalog-form-grid">
                  <div className="admin-form-group">
                    <label className="admin-label">Categoria</label>
                    <select className="admin-input" value={form.categoriaId} onChange={(e) => setForm((p) => ({ ...p, categoriaId: e.target.value }))}>
                      <option value="">Selecione</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Codigo PDV</label>
                    <input className="admin-input" value={form.codigoPdv} onChange={(e) => setForm((p) => ({ ...p, codigoPdv: e.target.value }))} placeholder="Ex: 12345" />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Titulo do item</label>
                    <input className="admin-input" value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder={isProdutos ? 'Ex: Burger artesanal da casa' : 'Ex: Bacon crocante'} />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">{form.tipo === 'pizza' ? 'Preco a partir de' : 'Preco'}</label>
                    {form.tipo === 'pizza' ? (
                      <input className="admin-input" disabled value={Number.isNaN(pizzaFromPrice) ? '' : `R$ ${pizzaFromPrice.toFixed(2).replace('.', ',')}`} placeholder="Configure tamanhos e sabores" />
                    ) : (
                      <input className="admin-input" value={form.preco} onChange={(e) => setForm((p) => ({ ...p, preco: e.target.value }))} placeholder="Ex: 32,90" />
                    )}
                  </div>
                  {form.tipo !== 'combo' ? (
                    <div className="admin-form-group">
                      <label className="admin-label">{form.tipo === 'pizza' ? 'Configuracao de tamanhos' : 'Medida'}</label>
                      <div className="admin-measure-grid">
                        <input className="admin-input" value={form.medidaQtd} onChange={(e) => setForm((p) => ({ ...p, medidaQtd: e.target.value }))} placeholder="Ex: 180" />
                        <select className="admin-input" value={form.medidaUn} onChange={(e) => setForm((p) => ({ ...p, medidaUn: e.target.value }))}>
                          <option value="un">Un</option>
                          <option value="g">Gramas</option>
                          <option value="ml">ml</option>
                          <option value="fatias">Fatias</option>
                          <option value="cm">cm</option>
                        </select>
                      </div>
                    </div>
                  ) : null}
                  <div className="admin-form-group">
                    <label className="admin-label">Serve quantas pessoas?</label>
                    <input className="admin-input" value={form.servePessoas} onChange={(e) => setForm((p) => ({ ...p, servePessoas: e.target.value }))} placeholder="Ex: 2 pessoas" />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Estoque</label>
                    <input className="admin-input" value={form.estoque} onChange={(e) => setForm((p) => ({ ...p, estoque: e.target.value }))} placeholder="Quantidade disponível" />
                  </div>
                  {form.tipo === 'pizza' ? (
                    <div className="admin-form-group admin-form-full admin-pizza-from-row">
                      <div className="admin-info-note">
                        <span aria-hidden>i</span>
                        Preco a partir de = menor tamanho + menor sabor selecionado.
                      </div>
                    </div>
                  ) : null}
                  <div className="admin-form-group admin-form-full">
                    <label className="admin-label">Descricao</label>
                    <textarea
                      className="admin-input"
                      maxLength={400}
                      value={form.descricao}
                      onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                      placeholder="Descreva o produto, preparo, sabores etc. (Opcional)"
                    />
                    <div className="admin-help-text">Maximo 400 caracteres</div>
                  </div>
                </div>

                {isProdutos && form.tipo === 'pizza' ? (
                  <div className="admin-pizza-sections">
                    <section className="admin-pizza-block">
                      <div className="admin-form-section-title">Tamanhos disponiveis</div>
                      {pizzaSizeProducts.length ? pizzaSizeProducts.map((sizeProduct) => {
                        const currentCfg = normalizePizzaConfig(form.pizzaConfig).tamanhoConfig.find((item) => item.tamanhoId === sizeProduct.id);
                        const enabled = Boolean(currentCfg);
                        return (
                          <div key={sizeProduct.id} className="admin-pizza-size-row">
                            <label>
                              <input type="checkbox" checked={enabled} onChange={() => togglePizzaSize(sizeProduct.id)} />
                              <span>{sizeProduct.nome} (R$ {Number(sizeProduct.preco || 0).toFixed(2).replace('.', ',')})</span>
                            </label>
                            <select
                              className="admin-input"
                              value={currentCfg?.maxSabores || 1}
                              disabled={!enabled}
                              onChange={(e) => setPizzaSizeMaxSabores(sizeProduct.id, e.target.value)}
                            >
                              <option value="1">1 sabor</option>
                              <option value="2">2 sabores</option>
                              <option value="3">3 sabores</option>
                              <option value="4">4 sabores</option>
                            </select>
                          </div>
                        );
                      }) : <p className="admin-help-text">Cadastre os tamanhos como produtos com tipo `tamanho_pizza`.</p>}
                    </section>

                    <section className="admin-pizza-block">
                      <div className="admin-form-section-title">Selecionar sabores</div>
                      <p className="admin-help-text">Os sabores devem estar em Adicionais com categoria sabor.</p>
                      <div className="admin-pizza-flavor-actions">
                        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setAllPizzaFlavors(true)}>Marcar todos</button>
                        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setAllPizzaFlavors(false)}>Desmarcar todos</button>
                      </div>
                      <input className="admin-input" placeholder="Buscar sabor..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} />
                      <div className="admin-pizza-flavor-grid">
                        {flavorItems
                          .filter((item) => !pickerSearch.trim() || item.nome.toLowerCase().includes(pickerSearch.toLowerCase()))
                          .map((flavor) => {
                            const selected = normalizePizzaConfig(form.pizzaConfig).saboresSelecionados.includes(flavor.id);
                            return (
                              <div key={flavor.id} className="admin-pizza-flavor-card">
                                <label>
                                  <input type="checkbox" checked={selected} onChange={() => togglePizzaFlavor(flavor.id)} />
                                  <span>{flavor.nome} (base: R$ {Number(flavor.preco || 0).toFixed(2).replace('.', ',')})</span>
                                </label>
                                {selected ? (
                                  <div className="admin-pizza-override-grid">
                                    {normalizePizzaConfig(form.pizzaConfig).tamanhoConfig.map((sizeCfg) => {
                                      const size = pizzaSizeProducts.find((item) => item.id === sizeCfg.tamanhoId);
                                      if (!size) return null;
                                      const key = `${flavor.id}:${size.id}`;
                                      return (
                                        <div key={key} className="admin-pizza-override-item">
                                          <span>{size.nome}</span>
                                          <input
                                            className="admin-input"
                                            value={normalizePizzaConfig(form.pizzaConfig).precoPorTamanhoSabor[key] || ''}
                                            placeholder={flavorPricePreview(flavor.id, size.id).toFixed(2).replace('.', ',')}
                                            onChange={(e) => setPizzaFlavorSizePrice(flavor.id, size.id, e.target.value)}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                      </div>
                    </section>

                    <section className="admin-pizza-block">
                      <div className="admin-form-section-title">Regras de precificacao</div>
                      <select
                        className="admin-input"
                        value={normalizePizzaConfig(form.pizzaConfig).regraPreco}
                        onChange={(e) => updatePizzaConfig((cfg) => ({ ...cfg, regraPreco: e.target.value }))}
                      >
                        <option value="media">Media dos sabores escolhidos</option>
                        <option value="mais_caro">Valor do sabor mais caro</option>
                      </select>
                      <p className="admin-help-text">Exemplo: Calabresa R$40, Mussarela R$35, Portuguesa R$45. Media = R$40,00. Mais caro = R$45,00.</p>
                      <label className="admin-option-row">
                        <span>Permitir sabores duplicados</span>
                        <Switch
                          checked={normalizePizzaConfig(form.pizzaConfig).permitirSaboresDuplicados}
                          label="Permitir sabores duplicados"
                          onChange={(checked) => updatePizzaConfig((cfg) => ({ ...cfg, permitirSaboresDuplicados: checked }))}
                        />
                      </label>
                    </section>
                  </div>
                ) : null}

                {isProdutos && form.tipo === 'combo' ? (
                  <div className="admin-pizza-sections">
                    <section className="admin-pizza-block">
                      <div className="admin-form-section-title">Produtos do combo</div>
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-icon-add-btn"
                        onClick={() => setComboPickerOpen(true)}
                        title="Adicionar produto ao combo"
                        aria-label="Adicionar produto ao combo"
                      >
                        +
                      </button>
                      <div className="admin-combo-list">
                        {normalizeComboConfig(form.comboConfig).itens.map((item) => {
                          const subtotal = Number(item.preco || 0) * Number(item.quantidade || 1);
                          return (
                            <div key={item.produtoId} className="admin-combo-row">
                              <div>
                                <strong>{item.nome}</strong>
                                <p>R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')} cada</p>
                              </div>
                              <input
                                type="number"
                                min={1}
                                className="admin-input"
                                value={item.quantidade}
                                onChange={(e) => updateComboItemQty(item.produtoId, e.target.value)}
                              />
                              <span>Subtotal: R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                              <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeComboItem(item.produtoId)}>
                                Remover
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                    <section className="admin-pizza-block">
                      <div className="admin-form-section-title">Calculos do combo</div>
                      <div className="admin-help-text" title="Soma de todos os produtos internos com quantidade.">
                        Valor total dos itens: R$ {comboTotals.totalItens.toFixed(2).replace('.', ',')}
                      </div>
                      <div className="admin-help-text">
                        Preço sugerido com {COMBO_SUGGESTED_DISCOUNT_PERCENT}% de desconto: R{' '}
                        {formatComboPriceBr(comboTotals.sugestao)}
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label" title="Preco final de venda do combo. Pode ser alterado livremente.">Preco do combo</label>
                        <input
                          className="admin-input"
                          value={normalizeComboConfig(form.comboConfig).precoCombo}
                          onChange={(e) =>
                            updateComboConfig((cfg) => ({ ...cfg, precoCombo: e.target.value }))
                          }
                          placeholder={formatComboPriceBr(comboTotals.sugestao)}
                        />
                      </div>
                      <div className="admin-help-text" title="Diferenca entre soma dos itens e preco final do combo.">
                        Economia: R$ {comboTotals.economia.toFixed(2).replace('.', ',')}
                        {!Number.isNaN(comboTotals.precoCombo) && comboTotals.totalItens > 0
                          ? ` (${comboTotals.descontoPercent}% de desconto)`
                          : ''}
                      </div>
                    </section>
                  </div>
                ) : null}

                <div className="admin-form-section-title">Disponibilidade</div>
                <div className="admin-catalog-switch-row">
                  <div className="admin-option-row">
                    <span>Entrega e retirada</span>
                    <Switch checked={form.entregaRetirada} label="Entrega e retirada" onChange={(checked) => setForm((p) => ({ ...p, entregaRetirada: checked }))} />
                  </div>
                  <div className="admin-option-row">
                    <span>Mesa e Balcão</span>
                    <Switch checked={form.mesaBalcao} label="Mesa e Balcão" onChange={(checked) => setForm((p) => ({ ...p, mesaBalcao: checked }))} />
                  </div>
                </div>

                {isProdutos ? (
                  <div className="admin-product-links">
                    {form.tipo !== 'combo' ? (
                      <div className="admin-product-config-row">
                        <div>
                          <strong>Peça também (cardápio)</strong>
                          <p>
                            Sugestões na sacola ao adicionar este produto (máximo {MAX_PECA_TAMBEM}).
                          </p>
                        </div>
                        <button
                          type="button"
                          className="admin-select-link"
                          onClick={() => {
                            setSaveError('');
                            setPecaTambemPickerOpen(true);
                          }}
                        >
                          Selecionar ({pecaTambemSelected.length}/{MAX_PECA_TAMBEM})
                        </button>
                      </div>
                    ) : null}
                    {form.tipo !== 'combo' && pecaTambemSelected.length ? (
                      <div className="admin-peca-tambem-list">
                        {pecaTambemSelected.map((product) => (
                          <div key={product.id} className="admin-combo-row admin-peca-tambem-row">
                            <div>
                              <strong>{product.nome}</strong>
                              <p>R$ {Number(product.preco || 0).toFixed(2).replace('.', ',')}</p>
                            </div>
                            <button
                              type="button"
                              className="admin-btn admin-btn-danger"
                              onClick={() => removePecaTambem(product.id)}
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {form.tipo !== 'pizza' && form.tipo !== 'combo' ? (
                      <div className="admin-product-config-row">
                        <div>
                          <strong>Remocao de ingredientes</strong>
                          <p>Itens selecionados poderao ser removidos pelo cliente.</p>
                        </div>
                        <button type="button" className="admin-select-link" onClick={() => setPickerType('remocoes')}>
                          Selecionar ({countSelection(form.remocoes)})
                        </button>
                      </div>
                    ) : null}
                    {form.tipo !== 'combo' ? (
                      <>
                        <div className="admin-product-config-row">
                          <div>
                            <strong>Adicionais, complementos, modificadores.</strong>
                            <p>Configure grupos de adicionais para aparecer no produto.</p>
                          </div>
                          <button type="button" className="admin-select-link" onClick={() => setPickerType('adicionais')}>
                            Selecionar adicionais ({countSelection(form.adicionais)})
                          </button>
                        </div>
                        {selectedAddonGroups.length ? (
                          <div className="admin-addon-rules-wrap">
                            {selectedAddonGroups.map((group) => {
                              const rule = getGroupRule(group.id);
                              const itemCount = group.items.length;
                              const min = Number(rule.min || 0);
                              const max = Number(rule.max || 0);
                              return (
                                <details key={group.id} className="admin-addon-group-accordion">
                                  <summary>
                                    <strong>
                                      {group.nome}
                                      {rule.obrigatorio ? <span className="admin-required-star">*</span> : null}
                                    </strong>
                                    <span>
                                      Ex: cliente podera escolher {min} a {max} itens deste grupo.
                                    </span>
                                  </summary>
                                  <div className="admin-addon-group-body">
                                    <div className="admin-addon-group-controls">
                                      <label>
                                        <input
                                          type="radio"
                                          name={`tipo-${group.id}`}
                                          checked={rule.tipoSelecao === 'simples'}
                                          onChange={() => setGroupRule(group.id, { tipoSelecao: 'simples', min: Math.min(1, Number(rule.min || 0)), max: 1 })}
                                        />
                                        Simples
                                      </label>
                                      <label>
                                        <input
                                          type="radio"
                                          name={`tipo-${group.id}`}
                                          checked={rule.tipoSelecao !== 'simples'}
                                          onChange={() => setGroupRule(group.id, { tipoSelecao: 'multipla', max: Math.max(Number(rule.max || 99), Number(rule.min || 0)) })}
                                        />
                                        Multipla
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={rule.tipoSelecao === 'simples' ? 1 : Math.max(99, itemCount)}
                                        className="admin-input"
                                        value={rule.min}
                                        onChange={(e) => setGroupRule(group.id, { min: Number(e.target.value || 0) })}
                                      />
                                      <input
                                        type="number"
                                        min={rule.tipoSelecao === 'simples' ? 1 : 0}
                                        max={Math.max(99, itemCount)}
                                        className="admin-input"
                                        value={rule.max}
                                        onChange={(e) => setGroupRule(group.id, { max: Number(e.target.value || 0) })}
                                        disabled={rule.tipoSelecao === 'simples'}
                                      />
                                    </div>
                                    {min >= 1 ? (
                                      <label className="admin-option-row">
                                        <span>Itens obrigatorios</span>
                                        <Switch
                                          checked={rule.obrigatorio === true}
                                          label={`Obrigatoriedade do grupo ${group.nome}`}
                                          onChange={(checked) => setGroupRule(group.id, { obrigatorio: checked })}
                                        />
                                      </label>
                                    ) : null}
                                    <div className="admin-addon-items-table">
                                      {group.items.map((item) => {
                                        const itemRule = rule.itens?.[item.id] || {
                                          precoAdicional: moneyInput(item.preco),
                                          permiteQuantidade: 1,
                                          opcional: true,
                                        };
                                        return (
                                          <div key={item.id} className="admin-addon-item-row">
                                            <strong>{item.nome}</strong>
                                            <input
                                              className="admin-input"
                                              value={itemRule.precoAdicional}
                                              onChange={(e) => setAddonItemRule(group.id, item.id, { precoAdicional: e.target.value })}
                                              placeholder="Preco adicional"
                                            />
                                            <input
                                              type="number"
                                              min={1}
                                              className="admin-input"
                                              value={itemRule.permiteQuantidade || 1}
                                              onChange={(e) => setAddonItemRule(group.id, item.id, { permiteQuantidade: Math.max(1, Number(e.target.value || 1)) })}
                                            />
                                            <label className="admin-option-row">
                                              <span>Item opcional?</span>
                                              <Switch
                                                checked={itemRule.opcional !== false}
                                                label={`Item opcional ${item.nome}`}
                                                onChange={(checked) => setAddonItemRule(group.id, item.id, { opcional: checked })}
                                              />
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                    {selectedAddonGroups.length > 1 ? (
                                      <div className="admin-addon-duplicate-row">
                                        <span>Duplicar regras para:</span>
                                        <select
                                          className="admin-input"
                                          defaultValue=""
                                          onChange={(e) => {
                                            duplicateGroupRules(group.id, e.target.value);
                                            e.target.value = '';
                                          }}
                                        >
                                          <option value="" disabled>Selecione o grupo</option>
                                          {selectedAddonGroups
                                            .filter((g) => g.id !== group.id)
                                            .map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                                        </select>
                                      </div>
                                    ) : null}
                                  </div>
                                </details>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="popup-footer">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={closeItemModal}>Cancelar</button>
                <button type="button" className="admin-btn admin-btn-primary" onClick={saveItem}>Salvar</button>
              </div>
            </div>
            <div className="popup-details-col admin-preview-col">
              <div className="popup-header admin-preview-header"><div className="popup-header-title">Preview</div></div>
              <div className="popup-body">
                <label className="admin-upload-box">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setSaveError('');
                      try {
                        setFormImage(await compressImageFile(file));
                      } catch {
                        setSaveError('Nao foi possivel processar essa imagem. Tente outra foto.');
                      }
                    }}
                  />
                  {formImage ? <img src={formImage} alt="Preview item" /> : <ImagePlaceholder size={90} />}
                  <span>Adicione uma foto</span>
                  <small>JPEG, PNG ate 3MB</small>
                </label>
                <div className="admin-preview-card">
                  <strong>{form.nome || 'Nome do item'}</strong>
                  {previewMeta() ? <span>{previewMeta()}</span> : null}
                  <p>{form.descricao || 'Descricao do item'}</p>
                  <div>
                    R$ {(
                      form.tipo === 'combo'
                        ? (Number.isNaN(comboTotals.precoCombo) ? comboTotals.sugestao : comboTotals.precoCombo)
                        : (Number.isNaN(pizzaFromPrice) ? 0 : pizzaFromPrice)
                    ).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {pickerType ? (
            <div className="admin-picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-picker-header">
                <div>
                  <h3>{pickerTitle}</h3>
                  <p>Escolha categorias inteiras ou itens individuais cadastrados em Adicionais.</p>
                </div>
                <button type="button" className="admin-picker-close" onClick={() => setPickerType('')}>x</button>
              </div>
              <div className="admin-picker-search-row">
                <input className="admin-input" placeholder="Pesquisar categoria ou item adicional..." value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} />
              </div>
              <div className="admin-picker-content">
                {addonCategories.length ? (
                  addonCategories.map((cat) => {
                    const catItems = filteredAddonItems(cat.id);
                    const categoryChecked = pickerSelection.categoriaIds.includes(cat.id);
                    if (pickerSearch.trim() && !cat.nome.toLowerCase().includes(pickerSearch.toLowerCase()) && !catItems.length) return null;
                    return (
                      <section key={cat.id} className="admin-picker-section">
                        <div className="admin-picker-section-head">
                          <div>
                            <h4>{cat.nome}</h4>
                            <span>{catItems.length} itens</span>
                          </div>
                          <button
                            type="button"
                            className={`admin-picker-check ${categoryChecked ? 'checked' : ''}`}
                            onClick={() => toggleSelection('categoria', cat.id)}
                          >
                            {categoryChecked ? 'Categoria selecionada' : 'Selecionar categoria'}
                          </button>
                        </div>
                        {catItems.map((item) => {
                          const itemChecked = pickerSelection.itemIds.includes(item.id);
                          return (
                            <div key={item.id} className="admin-picker-item">
                              {item.imagemUrl ? <img src={item.imagemUrl} alt="" /> : <ImagePlaceholder size={48} />}
                              <div>
                                <strong>{item.nome}</strong>
                                <p>{item.descricao || 'Sem descricao'}</p>
                              </div>
                              <span>R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}</span>
                              <button
                                type="button"
                                className={`admin-square-check ${itemChecked ? 'checked' : ''}`}
                                aria-label={`Selecionar ${item.nome}`}
                                onClick={() => toggleSelection('item', item.id)}
                              >
                                {itemChecked ? '✓' : ''}
                              </button>
                            </div>
                          );
                        })}
                      </section>
                    );
                  })
                ) : (
                  <div className="admin-empty-catalog">Cadastre grupos e itens em Adicionais para usar esta selecao.</div>
                )}
              </div>
              <div className="admin-picker-footer">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setPickerType('')}>Cancelar</button>
                <button type="button" className="admin-btn admin-btn-primary" onClick={() => setPickerType('')}>Salvar selecao</button>
              </div>
            </div>
          ) : null}

          {comboPickerOpen ? (
            <div className="admin-picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-picker-header">
                <div>
                  <h3>Adicionar produto ao combo</h3>
                  <p>Selecione produtos existentes para montar o combo.</p>
                </div>
                <button type="button" className="admin-picker-close" onClick={() => setComboPickerOpen(false)}>x</button>
              </div>
              <div className="admin-picker-search-row">
                <input className="admin-input" placeholder="Pesquisar produto..." value={comboSearch} onChange={(e) => setComboSearch(e.target.value)} />
              </div>
              <div className="admin-picker-content">
                {comboCandidates
                  .filter((item) => !comboSearch.trim() || item.nome.toLowerCase().includes(comboSearch.toLowerCase()))
                  .map((item) => {
                    const exists = normalizeComboConfig(form.comboConfig).itens.some((comboItem) => comboItem.produtoId === item.id);
                    return (
                      <div key={item.id} className="admin-picker-item">
                        {item.imagemUrl ? <img src={item.imagemUrl} alt="" /> : <ImagePlaceholder size={48} />}
                        <div>
                          <strong>{item.nome}</strong>
                          <p>{item.descricao || 'Sem descricao'}</p>
                        </div>
                        <span>R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}</span>
                        <button
                          type="button"
                          className={`admin-btn admin-icon-add-btn ${exists ? 'admin-btn-ghost' : 'admin-btn-primary'}`}
                          onClick={() => addProdutoToCombo(item)}
                          disabled={exists}
                          title={exists ? 'Já adicionado' : 'Adicionar ao combo'}
                          aria-label={exists ? 'Já adicionado' : 'Adicionar ao combo'}
                        >
                          {exists ? '✓' : '+'}
                        </button>
                      </div>
                    );
                  })}
              </div>
              <div className="admin-picker-footer">
                <button type="button" className="admin-btn admin-btn-primary" onClick={() => setComboPickerOpen(false)}>Concluir</button>
              </div>
            </div>
          ) : null}

          {pecaTambemPickerOpen ? (
            <div className="admin-picker-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-picker-header">
                <div>
                  <h3>Peça também</h3>
                  <p>
                    Escolha até {MAX_PECA_TAMBEM} produtos sugeridos na sacola do cardápio (
                    {pecaTambemSelected.length}/{MAX_PECA_TAMBEM} selecionados).
                  </p>
                </div>
                <button type="button" className="admin-picker-close" onClick={() => setPecaTambemPickerOpen(false)}>
                  x
                </button>
              </div>
              <div className="admin-picker-search-row">
                <input
                  className="admin-input"
                  placeholder="Pesquisar produto..."
                  value={pecaTambemSearch}
                  onChange={(e) => setPecaTambemSearch(e.target.value)}
                />
              </div>
              <div className="admin-picker-content">
                {pecaTambemCandidates
                  .filter(
                    (item) =>
                      !pecaTambemSearch.trim() || item.nome.toLowerCase().includes(pecaTambemSearch.toLowerCase())
                  )
                  .map((item) => {
                    const selected = normalizePecaTambemIds(form.pecaTambemIds).includes(item.id);
                    return (
                      <div key={item.id} className="admin-picker-item">
                        {item.imagemUrl ? <img src={item.imagemUrl} alt="" /> : <ImagePlaceholder size={48} />}
                        <div>
                          <strong>{item.nome}</strong>
                          <p>{item.descricao || 'Sem descricao'}</p>
                        </div>
                        <span>R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}</span>
                        <button
                          type="button"
                          className={`admin-square-check ${selected ? 'checked' : ''}`}
                          aria-label={selected ? `Remover ${item.nome}` : `Selecionar ${item.nome}`}
                          onClick={() => togglePecaTambem(item.id)}
                        >
                          {selected ? '✓' : ''}
                        </button>
                      </div>
                    );
                  })}
              </div>
              <div className="admin-picker-footer">
                <button type="button" className="admin-btn admin-btn-primary" onClick={() => setPecaTambemPickerOpen(false)}>
                  Concluir
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {editingCategory ? (
        <div className="admin-confirm-overlay" onClick={() => setEditingCategory(null)}>
          <div
            className={`admin-confirm-modal ${isProdutos ? '' : 'admin-category-edit-modal'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{isProdutos ? 'Editar categoria' : 'Editar categoria de adicional'}</h3>
            <p>
              {isProdutos
                ? 'Altere o nome e o ícone da categoria que aparece no painel e no cardápio.'
                : 'Configure nome e regras padrão de seleção para esta categoria de adicionais.'}
            </p>
            <div className="admin-form-group">
              <label className="admin-label">Nome</label>
              <input
                className="admin-input"
                value={editingCategory.nome}
                onChange={(e) => setEditingCategory((cat) => ({ ...cat, nome: e.target.value }))}
                autoFocus
              />
            </div>
            {isProdutos ? (
              <div className="admin-category-icon-picker">
                {CATEGORY_ICONS.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    className={`admin-category-icon-option ${editingCategory.icone === icon.id ? 'active' : ''}`}
                    onClick={() => setEditingCategory((cat) => ({ ...cat, icone: icon.id }))}
                    title={icon.label}
                  >
                    <CategoryIcon name={icon.id} size={28} tinted />
                  </button>
                ))}
              </div>
            ) : (
              <div className="admin-addon-category-rules">
                <label className="admin-option-row">
                  <input
                    type="checkbox"
                    checked={editingCategory.obrigatorio === true}
                    onChange={(e) =>
                      setEditingCategory((cat) => ({ ...cat, obrigatorio: e.target.checked }))
                    }
                  />
                  <span>Obrigatório</span>
                </label>
                <div className="admin-addon-group-controls">
                  <label className="admin-option-row">
                    <input
                      type="radio"
                      name="cat-tipo-selecao"
                      checked={editingCategory.tipoSelecao !== 'simples'}
                      onChange={() =>
                        setEditingCategory((cat) => ({ ...cat, tipoSelecao: 'multipla', max: Math.max(Number(cat.max || 1), Number(cat.min || 0)) }))
                      }
                    />
                    <span>Múltipla escolha</span>
                  </label>
                  <label className="admin-option-row">
                    <input
                      type="radio"
                      name="cat-tipo-selecao"
                      checked={editingCategory.tipoSelecao === 'simples'}
                      onChange={() =>
                        setEditingCategory((cat) => ({ ...cat, tipoSelecao: 'simples', min: Math.min(1, Number(cat.min || 0)), max: 1 }))
                      }
                    />
                    <span>Escolha simples</span>
                  </label>
                </div>
                <div className="admin-catalog-form-grid">
                  <div className="admin-form-group">
                    <label className="admin-label">Mínimo</label>
                    <input
                      className="admin-input"
                      type="number"
                      min={0}
                      value={editingCategory.min ?? 0}
                      disabled={editingCategory.tipoSelecao === 'simples'}
                      onChange={(e) =>
                        setEditingCategory((cat) => ({ ...cat, min: Number(e.target.value || 0) }))
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Máximo</label>
                    <input
                      className="admin-input"
                      type="number"
                      min={0}
                      value={editingCategory.max ?? 99}
                      disabled={editingCategory.tipoSelecao === 'simples'}
                      onChange={(e) =>
                        setEditingCategory((cat) => ({ ...cat, max: Number(e.target.value || 0) }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setEditingCategory(null)}>Cancelar</button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveCategoryName}>Salvar</button>
            </div>
          </div>
        </div>
      ) : null}

      {duplicateCategoryTarget ? (
        <div className="admin-confirm-overlay" onClick={() => setDuplicateCategoryTarget(null)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Duplicar categoria</h3>
            <p>
              Como deseja duplicar <strong>{duplicateCategoryTarget.nome}</strong>?
            </p>
            <div className="admin-confirm-actions admin-confirm-actions-stack">
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={() => confirmDuplicateCategory(true)}
              >
                {isProdutos ? 'Com produtos' : 'Com itens'}
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-ghost"
                onClick={() => confirmDuplicateCategory(false)}
              >
                Só categoria (vazia)
              </button>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setDuplicateCategoryTarget(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {removingCategory ? (
        <div className="admin-confirm-overlay" onClick={() => setRemovingCategory(null)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Remover categoria</h3>
            <p>
              Remover essa categoria apagará todos os {isProdutos ? 'produtos' : 'itens'} nela cadastrados!
            </p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setRemovingCategory(null)}>Cancelar</button>
              <button type="button" className="admin-btn admin-btn-danger" onClick={confirmRemoveCategory}>Remover Categoria</button>
            </div>
          </div>
        </div>
      ) : null}

      {removingProduct ? (
        <div className="admin-confirm-overlay" onClick={() => setRemovingProduct(null)}>
          <div className="admin-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Remover produto</h3>
            <p>
              Remover <strong>{removingProduct.nome}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="admin-confirm-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setRemovingProduct(null)}>
                Cancelar
              </button>
              <button type="button" className="admin-btn admin-btn-danger" onClick={confirmRemoveProduct}>
                Remover produto
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
