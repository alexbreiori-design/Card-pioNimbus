'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import AdminFaixaModal from '@/components/admin/AdminFaixaModal';
import { AdminCatalogSkeleton, useAdminMountSkeleton } from '@/components/admin/AdminSkeleton';
import { useAdminData } from '@/hooks/useAdminData';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import { isJsonDirty } from '@/lib/admin/isFormDirty';
import { uploadMenuAssetIfNeeded } from '@/lib/upload/menuAsset';
import AdminGroupedSortablePanel from './AdminGroupedSortablePanel';
import ImagePlaceholder from './ImagePlaceholder';
import AdminIcon from './AdminIcon';
import CategoryIcon from './CategoryIcon';
import CategoryIconPicker from '@/components/admin/CategoryIconPicker';
import CategoryLayoutPicker from '@/components/admin/CategoryLayoutPicker';
import ProductAddonPassoModal from '@/components/admin/ProductAddonPassoModal';
import AdminComboProductPickerModal from '@/components/admin/AdminComboProductPickerModal';
import PizzaPecaTambemPickerModal from '@/components/admin/pizza/PizzaPecaTambemPickerModal';
import ProductPromoChip from '@/components/cardapio/ProductPromoChip';
import { DraggableReorderList } from '@/components/lightswind/draggable-reorder-list';
import { CATEGORY_LAYOUT_DEFAULT } from '@/lib/cardapio/categoryLayouts';
import {
  createFaixaFromMembers,
  findFaixaForMember,
  removeFaixaExibicao,
  removeMemberFromFaixas,
  sanitizeFaixasExibicao,
  updateFaixaExibicao,
} from '@/lib/cardapio/faixasExibicao';
import {
  normalizeAddonPassos,
  resolveProductAddonPassos,
  syncAddonPassosToSelection,
} from '@/lib/productAddonPassos';
import {
  COMBO_SUGGESTED_DISCOUNT_PERCENT,
  formatComboPriceBr,
  MAX_PECA_TAMBEM,
  normalizePecaTambemIds,
  suggestedComboPrice,
} from '@/lib/productSuggestions';
import { formatMoneyBrInput } from '@/lib/moneyMask';

const TAB_ALL = 'all';

const EMPTY_SELECTION = {
  categoriaIds: [],
  itemIds: [],
};

const EMPTY_COMBO_CONFIG = {
  itens: [],
  precoCombo: '',
};

const EMPTY_ADDON_RULES = {
  grupos: {},
};

const DESTAQUE_MAX_LENGTH = 15;

const EMPTY_FORM = {
  tipo: 'comum',
  nome: '',
  codigoPdv: '',
  categoriaId: '',
  preco: '',
  precoApartirDe: false,
  pecaTambemIds: [],
  medidaQtd: '',
  medidaUn: 'un',
  servePessoas: '',
  estoque: '',
  descricao: '',
  destaque: '',
  disponivel: true,
  entregaRetirada: true,
  mesaBalcao: true,
  ingredientesRemoviveis: true,
  adicionaisHabilitados: true,
  remocoes: EMPTY_SELECTION,
  adicionais: EMPTY_SELECTION,
  adicionaisConfig: EMPTY_ADDON_RULES,
  adicionaisPassos: [],
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
  const num = typeof value === 'number' ? value : parseMoney(value);
  if (!Number.isFinite(num)) return '';
  return formatMoneyBrInput(String(Math.round(num * 100)));
}

function selectionFrom(value) {
  return {
    categoriaIds: Array.isArray(value?.categoriaIds) ? value.categoriaIds : [],
    itemIds: Array.isArray(value?.itemIds) ? value.itemIds : [],
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
    tipo: item.tipo || (item.tags?.includes('combo') ? 'combo' : 'comum'),
    nome: item.nome || '',
    codigoPdv: item.codigoPdv || '',
    categoriaId: item.categoriaId || fallbackCategoryId || '',
    preco: moneyInput(item.preco),
    precoApartirDe: item.precoApartirDe === true,
    pecaTambemIds: normalizePecaTambemIds(item.pecaTambemIds),
    medidaQtd: measure.medidaQtd,
    medidaUn: measure.medidaUn,
    servePessoas: item.servePessoas || '',
    estoque: item.estoque || '',
    descricao: item.descricao || '',
    destaque: String(item.destaque || '').slice(0, DESTAQUE_MAX_LENGTH),
    disponivel: item.ativo !== false,
    entregaRetirada: item.entregaRetirada !== false,
    mesaBalcao: item.mesaBalcao !== false,
    ingredientesRemoviveis: item.ingredientesRemoviveis !== false,
    adicionaisHabilitados: item.adicionaisHabilitados !== false,
    remocoes: selectionFrom(item.remocoes),
    adicionais: selectionFrom(item.adicionais),
    adicionaisConfig: normalizeAddonRules(item.adicionaisConfig),
    adicionaisPassos: [],
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
  if (!dataUrl?.startsWith('data:image/')) return dataUrl || '';
  const compressed = await compressImageDataUrl(dataUrl);
  return uploadMenuAssetIfNeeded(slug, compressed, { folder });
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
      capaOriginalUrl: await persistImageUrl(slug, data.loja?.capaOriginalUrl, 'loja'),
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

  const { data, saveData, activeSlug, ready } = useAdminData();
  const showCatalogSkeleton = useAdminMountSkeleton(ready);
  const productTypeOptions = useMemo(() => ['comum', 'combo'], []);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState(TAB_ALL);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState('');
  const [categoryMenuId, setCategoryMenuId] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [removingCategory, setRemovingCategory] = useState(null);
  const [removingProduct, setRemovingProduct] = useState(null);
  const [duplicateCategoryTarget, setDuplicateCategoryTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formBaseline, setFormBaseline] = useState(null);
  const [formImage, setFormImage] = useState('');
  const [formImageBaseline, setFormImageBaseline] = useState('');
  const [saveError, setSaveError] = useState('');
  const [pickerType, setPickerType] = useState('');
  const [pickerSearch, setPickerSearch] = useState('');
  const [comboPickerOpen, setComboPickerOpen] = useState(false);
  const [comboPriceManual, setComboPriceManual] = useState(false);
  const [pecaTambemPickerOpen, setPecaTambemPickerOpen] = useState(false);
  const [addonPassoModalOpen, setAddonPassoModalOpen] = useState(false);
  const [editingAddonPassoId, setEditingAddonPassoId] = useState('');
  const [removingAddonPassoId, setRemovingAddonPassoId] = useState('');
  const [descricaoEditing, setDescricaoEditing] = useState(false);
  const [descricaoDraft, setDescricaoDraft] = useState('');
  const [destaqueEditing, setDestaqueEditing] = useState(false);
  const [destaqueDraft, setDestaqueDraft] = useState('');
  const [faixaModal, setFaixaModal] = useState(null);

  const categories = useMemo(() => data[catKey] || [], [data, catKey]);
  const faixasExibicao = useMemo(
    () =>
      isProdutos
        ? sanitizeFaixasExibicao(
            data.faixasExibicao,
            (data.categorias || []).map((cat) => cat.id)
          )
        : [],
    [isProdutos, data.faixasExibicao, data.categorias]
  );
  const items = useMemo(() => data[itemKey] || [], [data, itemKey]);
  const addonCategories = useMemo(() => data.adicionaisCategorias || [], [data.adicionaisCategorias]);
  const addonItems = useMemo(() => data.adicionaisItens || [], [data.adicionaisItens]);
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const q = search.toLowerCase();
    return categories.filter((cat) => cat.nome.toLowerCase().includes(q));
  }, [categories, search]);

  const visibleCategories = useMemo(() => {
    if (selectedCat === TAB_ALL) return filteredCategories;
    return filteredCategories.filter((c) => c.id === selectedCat);
  }, [filteredCategories, selectedCat]);

  const browseItems = useMemo(() => {
    const visibleIds = new Set(visibleCategories.map((cat) => cat.id));
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!visibleIds.has(item.categoriaId)) return false;
      if (!q) return true;
      return (
        String(item.nome || '').toLowerCase().includes(q) ||
        String(item.descricao || '').toLowerCase().includes(q)
      );
    });
  }, [items, search, visibleCategories]);

  const pickerSelection = pickerType ? form[pickerType] : EMPTY_SELECTION;
  const pickerTitle = pickerType === 'remocoes' ? 'Remocao de ingredientes' : 'Selecao de adicionais';
  const addonPassos = useMemo(
    () => normalizeAddonPassos(form.adicionaisPassos),
    [form.adicionaisPassos]
  );
  const editingAddonPasso = useMemo(
    () => addonPassos.find((passo) => passo.id === editingAddonPassoId) || null,
    [addonPassos, editingAddonPassoId]
  );
  const productPickerCandidates = useMemo(() => {
    const catOrdem = new Map((data.categorias || []).map((cat) => [cat.id, Number(cat.ordem) || 0]));
    return (data.produtos || [])
      .filter((p) => p.ativo !== false && p.tipo !== 'combo' && p.id !== editingItemId)
      .slice()
      .sort((a, b) => {
        const catDiff = (catOrdem.get(a.categoriaId) ?? 9999) - (catOrdem.get(b.categoriaId) ?? 9999);
        if (catDiff !== 0) return catDiff;
        return (Number(a.ordem) || 0) - (Number(b.ordem) || 0);
      });
  }, [data.produtos, data.categorias, editingItemId]);
  const comboCandidates = productPickerCandidates;
  const pecaTambemCandidates = productPickerCandidates;
  const pecaTambemCategories = useMemo(
    () =>
      [...(data.categorias || [])]
        .filter((cat) => cat.ativo !== false)
        .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0)),
    [data.categorias]
  );
  const pecaTambemSelected = useMemo(
    () =>
      normalizePecaTambemIds(form.pecaTambemIds)
        .map((id) => (data.produtos || []).find((p) => p.id === id))
        .filter(Boolean),
    [form.pecaTambemIds, data.produtos]
  );

  function openNewCategory() {
    if (isProdutos) {
      setEditingCategory({
        isNew: true,
        id: uid('cat'),
        nome: '',
        icone: 'burger',
        exibicaoCardapio: CATEGORY_LAYOUT_DEFAULT,
      });
    } else {
      setEditingCategory({
        isNew: true,
        id: uid('add-cat'),
        nome: '',
        obrigatorio: false,
        min: 0,
        max: 99,
        tipoSelecao: 'multipla',
      });
    }
    setCategoryMenuId('');
  }

  function openEditCategory(cat) {
    if (isProdutos) {
      setEditingCategory({
        id: cat.id,
        nome: cat.nome,
        icone: cat.icone || 'burger',
        exibicaoCardapio: cat.exibicaoCardapio || CATEGORY_LAYOUT_DEFAULT,
      });
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

    if (editingCategory.isNew) {
      const baseCategory = {
        id: editingCategory.id,
        nome,
        ativo: true,
        ordem: data[catKey]?.length || 0,
      };
      const nextCategory = isProdutos
        ? {
            ...baseCategory,
            icone: editingCategory.icone || 'burger',
            exibicaoCardapio: editingCategory.exibicaoCardapio || CATEGORY_LAYOUT_DEFAULT,
          }
        : (() => {
            const min = Math.max(0, Number(editingCategory.min || 0));
            let max = Math.max(min, Number(editingCategory.max || min));
            if (editingCategory.tipoSelecao === 'simples') max = 1;
            return {
              ...baseCategory,
              obrigatorio: editingCategory.obrigatorio === true,
              min,
              max,
              tipoSelecao: editingCategory.tipoSelecao === 'simples' ? 'simples' : 'multipla',
            };
          })();

      saveData((prev) => ({
        ...prev,
        [catKey]: [...prev[catKey], nextCategory],
      }));
      setEditingCategory(null);
      return;
    }

    saveData((prev) => ({
      ...prev,
      [catKey]: prev[catKey].map((cat) => {
        if (cat.id !== editingCategory.id) return cat;
        if (isProdutos) {
          return {
            ...cat,
            nome,
            icone: editingCategory.icone || cat.icone || 'burger',
            exibicaoCardapio: editingCategory.exibicaoCardapio || CATEGORY_LAYOUT_DEFAULT,
          };
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
      ...(isProdutos
        ? {
            faixasExibicao: removeMemberFromFaixas(prev.faixasExibicao, removingCategory.id),
          }
        : {}),
    }));
    if (selectedCat === removingCategory.id) setSelectedCat(TAB_ALL);
    setRemovingCategory(null);
  }

  function openCreateFaixaModal() {
    if (!isProdutos || categories.length < 2) return;
    setFaixaModal({
      mode: 'create',
      faixaId: null,
      membroIds: [],
      nome: '',
      layout: CATEGORY_LAYOUT_DEFAULT,
    });
  }

  function openEditFaixaModal(faixa) {
    setFaixaModal({
      mode: 'edit',
      faixaId: faixa.id,
      membroIds: [...(faixa.membroIds || [])],
      nome: faixa.nome,
      layout: faixa.layout,
    });
  }

  function confirmFaixaModal({ nome, layout, membroIds }) {
    if (!faixaModal || !isProdutos) return;
    const ids = Array.isArray(membroIds) ? membroIds : [];
    saveData((prev) => {
      const current = sanitizeFaixasExibicao(
        prev.faixasExibicao,
        (prev.categorias || []).map((cat) => cat.id)
      );
      const cleaned = current.map((faixa) => {
        if (faixaModal.mode === 'edit' && faixa.id === faixaModal.faixaId) return faixa;
        return {
          ...faixa,
          membroIds: faixa.membroIds.filter((id) => !ids.includes(id)),
        };
      });
      if (faixaModal.mode === 'edit' && faixaModal.faixaId) {
        return {
          ...prev,
          faixasExibicao: updateFaixaExibicao(cleaned, faixaModal.faixaId, {
            nome,
            layout,
            membroIds: ids,
          }),
        };
      }
      return {
        ...prev,
        faixasExibicao: createFaixaFromMembers({
          nome,
          layout,
          membroIds: ids,
          existing: cleaned,
        }),
      };
    });
    setFaixaModal(null);
  }

  function confirmRemoveProduct() {
    if (!removingProduct) return;
    saveData((prev) => {
      const next = {
        ...prev,
        [itemKey]: prev[itemKey].filter((item) => item.id !== removingProduct.id),
      };
      if (isProdutos) {
        next.promocoes = (prev.promocoes || []).filter((p) => p.produtoId !== removingProduct.id);
      }
      return next;
    });
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
    const initial = { ...EMPTY_FORM, categoriaId: catId, adicionaisPassos: [] };
    setForm(initial);
    setFormBaseline(initial);
    setFormImage('');
    setFormImageBaseline('');
    setSaveError('');
    setComboPickerOpen(false);
    setComboPriceManual(false);
    setPecaTambemPickerOpen(false);
    setAddonPassoModalOpen(false);
    setEditingAddonPassoId('');
    setRemovingAddonPassoId('');
    setDescricaoEditing(false);
    setDescricaoDraft('');
    setDestaqueEditing(false);
    setDestaqueDraft('');
    setModalOpen(true);
  }

  function openEditItemModal(item) {
    setEditingItemId(item.id);
    const initial = {
      ...itemToForm(item, item.categoriaId),
      adicionaisPassos: resolveProductAddonPassos(item, {
        categories: addonCategories,
        items: addonItems,
      }),
    };
    setForm(initial);
    setFormBaseline(initial);
    const image = item.imagemUrl || '';
    setFormImage(image);
    setFormImageBaseline(image);
    setSaveError('');
    setComboPickerOpen(false);
    setComboPriceManual(true);
    setPecaTambemPickerOpen(false);
    setAddonPassoModalOpen(false);
    setEditingAddonPassoId('');
    setRemovingAddonPassoId('');
    setDescricaoEditing(false);
    setDescricaoDraft('');
    setDestaqueEditing(false);
    setDestaqueDraft('');
    setModalOpen(true);
  }

  function closeItemModal() {
    setModalOpen(false);
    setFormBaseline(null);
    setFormImageBaseline('');
    setPickerType('');
    setPickerSearch('');
    setComboPickerOpen(false);
    setComboPriceManual(false);
    setPecaTambemPickerOpen(false);
    setAddonPassoModalOpen(false);
    setEditingAddonPassoId('');
    setRemovingAddonPassoId('');
    setDescricaoEditing(false);
    setDescricaoDraft('');
    setDestaqueEditing(false);
    setDestaqueDraft('');
  }

  const isItemFormDirty = useMemo(() => {
    if (!modalOpen) return false;
    if (formImage !== formImageBaseline) return true;
    if (!formBaseline) return false;
    return isJsonDirty(form, formBaseline);
  }, [modalOpen, form, formBaseline, formImage, formImageBaseline]);

  const {
    overlayPointerDown,
    overlayClick,
    requestClose: requestCloseItemModal,
    discardOpen: itemDiscardOpen,
    confirmDiscard: confirmDiscardItemModal,
    cancelDiscard: cancelDiscardItemModal,
  } = useAdminOverlayClose({
    onClose: closeItemModal,
    isDirty: isItemFormDirty,
  });

  async function saveItem() {
    setSaveError('');
    const nome = form.nome.trim();
    const comboConfig = normalizeComboConfig(form.comboConfig);
    const comboPrice = parseMoney(comboConfig.precoCombo);
    const preco = form.tipo === 'combo' ? comboPrice : parseMoney(form.preco);
    if (!nome || !form.categoriaId || Number.isNaN(preco)) return;
    if (form.tipo === 'combo' && comboConfig.itens.length < 2) {
      setSaveError('Combo precisa ter pelo menos 2 produtos.');
      return;
    }
    const syncedAddons =
      form.tipo === 'combo'
        ? {
            adicionaisPassos: [],
            adicionais: EMPTY_SELECTION,
            adicionaisConfig: EMPTY_ADDON_RULES,
          }
        : syncAddonPassosToSelection(form.adicionaisPassos, { items: addonItems });

    if (form.tipo !== 'combo') {
      for (const passo of syncedAddons.adicionaisPassos) {
        const cat = addonCategories.find((row) => row.id === passo.categoriaAdicionalId);
        const catName = cat?.nome || passo.titulo || 'Adicionais';
        if (!passo.categoriaAdicionalId || !passo.itemIds.length) {
          setSaveError(`Complete o passo "${passo.titulo || catName}" com categoria e itens.`);
          return;
        }
        if (Number(passo.min || 0) > Number(passo.max || 0)) {
          setSaveError(`No passo "${passo.titulo || catName}", o mínimo não pode ser maior que o máximo.`);
          return;
        }
        const unitCap = passo.permitirRepetir
          ? passo.itemIds.length * Math.max(2, Number(passo.maxRepeticoes || 2))
          : passo.itemIds.length;
        if (Number(passo.min || 0) > unitCap) {
          setSaveError(
            passo.permitirRepetir
              ? `No passo "${passo.titulo || catName}", o mínimo não pode ser maior que itens × máx. repetições.`
              : `No passo "${passo.titulo || catName}", o mínimo não pode ser maior que a quantidade de itens selecionados.`
          );
          return;
        }
      }
    }
    const imagemUrl = await persistImageUrl(activeSlug || data.loja?.slug, formImage, isProdutos ? 'produtos' : 'adicionais');

    const payload = {
      categoriaId: form.categoriaId,
      nome,
      descricao: form.descricao.trim(),
      destaque: isProdutos ? String(form.destaque || '').trim().slice(0, DESTAQUE_MAX_LENGTH) : '',
      preco,
      precoApartirDe: isProdutos ? form.precoApartirDe === true : false,
      imagemUrl,
      ativo: form.disponivel,
      tags: form.tipo === 'combo' ? ['combo'] : [],
      tipo: form.tipo,
      codigoPdv: form.codigoPdv.trim(),
      pecaTambemIds: form.tipo === 'combo' ? [] : normalizePecaTambemIds(form.pecaTambemIds),
      medida: form.tipo === 'combo' ? '' : form.medidaQtd ? `${form.medidaQtd} ${form.medidaUn}` : '',
      servePessoas: form.servePessoas || '',
      estoque: form.estoque || '',
      entregaRetirada: form.entregaRetirada,
      mesaBalcao: form.mesaBalcao,
      ingredientesRemoviveis: false,
      adicionaisHabilitados: form.tipo === 'combo' ? false : form.adicionaisHabilitados,
      remocoes: EMPTY_SELECTION,
      adicionais: syncedAddons.adicionais,
      adicionaisConfig: syncedAddons.adicionaisConfig,
      adicionaisPassos: syncedAddons.adicionaisPassos,
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

  function toggleAddonCategory(catId, catItems) {
    if (!pickerType) return;
    const itemIdsInCategory = new Set(catItems.map((item) => item.id));
    setForm((prev) => {
      const current = selectionFrom(prev[pickerType]);
      const fullySelected =
        current.categoriaIds.includes(catId) ||
        (catItems.length > 0 && catItems.every((item) => current.itemIds.includes(item.id)));

      if (fullySelected) {
        return {
          ...prev,
          [pickerType]: {
            categoriaIds: current.categoriaIds.filter((id) => id !== catId),
            itemIds: current.itemIds.filter((id) => !itemIdsInCategory.has(id)),
          },
        };
      }

      return {
        ...prev,
        [pickerType]: {
          categoriaIds: [...current.categoriaIds.filter((id) => id !== catId), catId],
          itemIds: current.itemIds.filter((id) => !itemIdsInCategory.has(id)),
        },
      };
    });
  }

  function toggleAddonItem(catId, itemId, catItems) {
    if (!pickerType) return;
    const itemIdsInCategory = catItems.map((item) => item.id);
    setForm((prev) => {
      const current = selectionFrom(prev[pickerType]);

      if (current.categoriaIds.includes(catId)) {
        const nextItemIds = itemIdsInCategory.filter((id) => id !== itemId);
        return {
          ...prev,
          [pickerType]: {
            categoriaIds: current.categoriaIds.filter((id) => id !== catId),
            itemIds: [
              ...current.itemIds.filter((id) => !itemIdsInCategory.includes(id)),
              ...nextItemIds,
            ],
          },
        };
      }

      const has = current.itemIds.includes(itemId);
      let nextItemIds = has
        ? current.itemIds.filter((id) => id !== itemId)
        : [...current.itemIds, itemId];

      const allSelected =
        itemIdsInCategory.length > 0 && itemIdsInCategory.every((id) => nextItemIds.includes(id));
      if (allSelected) {
        return {
          ...prev,
          [pickerType]: {
            categoriaIds: [...current.categoriaIds.filter((id) => id !== catId), catId],
            itemIds: nextItemIds.filter((id) => !itemIdsInCategory.includes(id)),
          },
        };
      }

      return {
        ...prev,
        [pickerType]: {
          categoriaIds: current.categoriaIds.filter((id) => id !== catId),
          itemIds: nextItemIds,
        },
      };
    });
  }

  function isAddonCategorySelected(catId, catItems) {
    const current = pickerSelection;
    if (current.categoriaIds.includes(catId)) return true;
    return (
      catItems.length > 0 && catItems.every((item) => current.itemIds.includes(item.id))
    );
  }

  function isAddonItemSelected(catId, itemId) {
    if (pickerSelection.categoriaIds.includes(catId)) return true;
    return pickerSelection.itemIds.includes(itemId);
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

  function withComboPriceSuggestion(cfg, manual = comboPriceManual) {
    if (manual) return cfg;
    const total = cfg.itens.reduce(
      (sum, item) => sum + Number(item.preco || 0) * Number(item.quantidade || 1),
      0
    );
    if (!cfg.itens.length) {
      return { ...cfg, precoCombo: '' };
    }
    return { ...cfg, precoCombo: formatComboPriceBr(suggestedComboPrice(total)) };
  }

  function updateComboConfig(updater, options = {}) {
    const manual = options.manual ?? comboPriceManual;
    setForm((prev) => ({
      ...prev,
      comboConfig: withComboPriceSuggestion(updater(normalizeComboConfig(prev.comboConfig)), manual),
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

  function removePecaTambem(produtoId) {
    setForm((prev) => ({
      ...prev,
      pecaTambemIds: normalizePecaTambemIds(prev.pecaTambemIds).filter((id) => id !== produtoId),
    }));
  }

  function addProdutoToCombo(product) {
    updateComboConfig((cfg) => {
      if (cfg.itens.some((item) => item.produtoId === product.id)) return cfg;
      return {
        ...cfg,
        itens: [
          ...cfg.itens,
          {
            produtoId: product.id,
            nome: product.nome,
            preco: Number(product.preco || 0),
            quantidade: 1,
          },
        ],
      };
    });
  }

  function toggleProdutoNoCombo(product) {
    updateComboConfig((cfg) => {
      if (cfg.itens.some((item) => item.produtoId === product.id)) {
        return {
          ...cfg,
          itens: cfg.itens.filter((item) => item.produtoId !== product.id),
        };
      }
      return {
        ...cfg,
        itens: [
          ...cfg.itens,
          {
            produtoId: product.id,
            nome: product.nome,
            preco: Number(product.preco || 0),
            quantidade: 1,
          },
        ],
      };
    });
  }

  function setComboSelectedIds(nextIds) {
    const idSet = new Set(nextIds);
    updateComboConfig((cfg) => {
      const kept = cfg.itens.filter((item) => idSet.has(item.produtoId));
      const keptIds = new Set(kept.map((item) => item.produtoId));
      const added = comboCandidates
        .filter((product) => idSet.has(product.id) && !keptIds.has(product.id))
        .map((product) => ({
          produtoId: product.id,
          nome: product.nome,
          preco: Number(product.preco || 0),
          quantidade: 1,
        }));
      return { ...cfg, itens: [...kept, ...added] };
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

  if (showCatalogSkeleton) {
    return <AdminCatalogSkeleton />;
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
          {isProdutos && categories.length >= 2 ? (
            <button type="button" className="admin-btn admin-btn-ghost" onClick={openCreateFaixaModal}>
              Agrupar categorias
            </button>
          ) : null}
          <button type="button" className="admin-btn admin-btn-ghost" onClick={openNewCategory}>
            <AdminIcon name="plus" />
            Nova categoria
          </button>
        </div>
      </div>

      <AdminGroupedSortablePanel
        browseMode
        defaultExpandAll
        groups={visibleCategories}
        items={browseItems}
        groupIdKey="categoriaId"
        onGroupsReorder={(next) => {
          const orderMap = new Map(next.map((cat, ordem) => [cat.id, ordem]));
          saveData((prev) => ({
            ...prev,
            [catKey]: prev[catKey].map((cat) =>
              orderMap.has(cat.id) ? { ...cat, ordem: orderMap.get(cat.id) } : cat
            ),
          }));
        }}
        onItemsChange={(next) => saveData((prev) => ({ ...prev, [itemKey]: next }))}
        renderGroupHeader={(cat, { isExpanded, onToggle }) => {
          const faixa = isProdutos ? findFaixaForMember(faixasExibicao, cat.id) : null;
          return (
          <div className={`admin-catalog-title-row admin-grouped-sort-title-row${faixa ? ' is-in-faixa' : ''}`}>
            <button
              type="button"
              className="admin-catalog-collapse-btn"
              onClick={onToggle}
              aria-expanded={isExpanded}
            >
              <span className={`admin-collapse-chevron ${isExpanded ? '' : 'is-collapsed'}`} aria-hidden>
                ›
              </span>
              <span className="admin-section-icon">
                {isProdutos ? (
                  <CategoryIcon name={cat.icone || 'burger'} size={22} tinted />
                ) : (
                  <AdminIcon name="category" />
                )}
              </span>
              <h3>{cat.nome}</h3>
            </button>
            {faixa ? (
              <button
                type="button"
                className="admin-faixa-badge"
                onClick={() => openEditFaixaModal(faixa)}
              >
                Seção: {faixa.nome}
              </button>
            ) : null}
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
          );
        }}
        renderGroupActions={(cat) => {
          const faixa = isProdutos ? findFaixaForMember(faixasExibicao, cat.id) : null;
          return (
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
                  <button type="button" onClick={() => openEditCategory(cat)}>Editar categoria</button>
                  {faixa ? (
                    <button
                      type="button"
                      onClick={() => {
                        openEditFaixaModal(faixa);
                        setCategoryMenuId('');
                      }}
                    >
                      Editar seção do cardápio
                    </button>
                  ) : null}
                  {faixa ? (
                    <button
                      type="button"
                      onClick={() => {
                        saveData((prev) => ({
                          ...prev,
                          faixasExibicao: removeMemberFromFaixas(prev.faixasExibicao, cat.id),
                        }));
                        setCategoryMenuId('');
                      }}
                    >
                      Remover da seção
                    </button>
                  ) : null}
                  {faixa ? (
                    <button
                      type="button"
                      onClick={() => {
                        saveData((prev) => ({
                          ...prev,
                          faixasExibicao: removeFaixaExibicao(prev.faixasExibicao, faixa.id),
                        }));
                        setCategoryMenuId('');
                      }}
                    >
                      Desagrupar seção
                    </button>
                  ) : null}
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
          );
        }}
        renderItemPreview={(item) => (
          <div className="admin-catalog-item-row admin-grouped-sort-browse-item">
            {item.imagemUrl ? (
              <img
                className="admin-catalog-item-img"
                src={item.imagemUrl}
                alt=""
                loading="lazy"
                decoding="async"
              />
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
              <div className="admin-order-price">
                {item.precoApartirDe
                  ? `À partir de R$ ${Number(item.preco || 0).toFixed(2).replace('.', ',')}`
                  : `R$ ${Number(item.preco || 0).toFixed(2).replace('.', ',')}`}
              </div>
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
              <button type="button" className="admin-link-btn" onClick={() => duplicateItem(item, item.categoriaId)}>
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
        )}
      />

      {modalOpen ? (
        <>
        <div
          className="overlay open admin-item-overlay"
          role="presentation"
          onPointerDown={overlayPointerDown}
          onClick={overlayClick}
        >
          <div className="product-popup admin-product-popup" onClick={(e) => e.stopPropagation()}>
            <div className="admin-product-popup-main">
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
                        {t === 'comum' ? 'Padrão' : 'Combo'}
                      </button>
                    ))}
                  </div>
                ) : null}

                {saveError ? <div className="admin-error">{saveError}</div> : null}

                <div className="admin-catalog-form-grid admin-product-form-grid">
                  <div className="admin-form-group">
                    <label className="admin-label">{isProdutos ? 'Nome do produto' : 'Nome do item'}</label>
                    <input
                      className="admin-input"
                      value={form.nome}
                      onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                      placeholder={isProdutos ? 'Ex: Burger artesanal da casa' : 'Ex: Bacon crocante'}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Preço</label>
                    {isProdutos ? (
                      <div className="admin-product-price-apartir-row">
                        <input
                          className="admin-input"
                          inputMode="numeric"
                          value={form.preco}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, preco: formatMoneyBrInput(e.target.value) }))
                          }
                          placeholder="R$ 0,00"
                        />
                        <button
                          type="button"
                          className={`admin-product-apartir-toggle${form.precoApartirDe ? ' is-on' : ''}`}
                          onClick={() =>
                            setForm((p) => ({ ...p, precoApartirDe: !p.precoApartirDe }))
                          }
                          aria-pressed={form.precoApartirDe === true}
                        >
                          à partir de
                        </button>
                      </div>
                    ) : (
                      <input
                        className="admin-input"
                        inputMode="numeric"
                        value={form.preco}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, preco: formatMoneyBrInput(e.target.value) }))
                        }
                        placeholder="R$ 0,00"
                      />
                    )}
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Categoria</label>
                    <select
                      className="admin-input"
                      value={form.categoriaId}
                      onChange={(e) => setForm((p) => ({ ...p, categoriaId: e.target.value }))}
                    >
                      <option value="">Selecione</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label className="admin-label">Estoque</label>
                    <input
                      className="admin-input"
                      value={form.estoque}
                      onChange={(e) => setForm((p) => ({ ...p, estoque: e.target.value }))}
                      placeholder="Quantidade disponível"
                    />
                  </div>
                  {form.tipo !== 'combo' ? (
                    <div className="admin-product-form-measure-row">
                      <div className="admin-form-group">
                        <label className="admin-label">Medida</label>
                        <input
                          className="admin-input"
                          value={form.medidaQtd}
                          onChange={(e) => setForm((p) => ({ ...p, medidaQtd: e.target.value }))}
                          placeholder="Ex: 180"
                        />
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Unidade de medida</label>
                        <select
                          className="admin-input"
                          value={form.medidaUn}
                          onChange={(e) => setForm((p) => ({ ...p, medidaUn: e.target.value }))}
                        >
                          <option value="un">Un</option>
                          <option value="g">Gramas</option>
                          <option value="ml">ml</option>
                          <option value="fatias">Fatias</option>
                          <option value="cm">cm</option>
                        </select>
                      </div>
                      <div className="admin-form-group">
                        <label className="admin-label">Serve quantas pessoas?</label>
                        <input
                          className="admin-input"
                          value={form.servePessoas}
                          onChange={(e) => setForm((p) => ({ ...p, servePessoas: e.target.value }))}
                          placeholder="Ex: 2 pessoas"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="admin-form-group">
                      <label className="admin-label">Serve quantas pessoas?</label>
                      <input
                        className="admin-input"
                        value={form.servePessoas}
                        onChange={(e) => setForm((p) => ({ ...p, servePessoas: e.target.value }))}
                        placeholder="Ex: 2 pessoas"
                      />
                    </div>
                  )}
                  <div className="admin-form-group admin-form-full admin-product-descricao-block">
                    <div className="admin-order-collapsed-head">
                      <label className="admin-label">Descrição</label>
                      {!descricaoEditing ? (
                        <button
                          type="button"
                          className="admin-link-btn"
                          onClick={() => {
                            setDescricaoDraft(form.descricao || '');
                            setDescricaoEditing(true);
                          }}
                        >
                          {form.descricao?.trim() ? 'Editar' : 'Adicionar'}
                        </button>
                      ) : null}
                    </div>
                    {descricaoEditing ? (
                      <div className="admin-product-descricao-editor">
                        <textarea
                          className="admin-input admin-product-descricao-textarea"
                          maxLength={400}
                          value={descricaoDraft}
                          onChange={(e) => setDescricaoDraft(e.target.value)}
                          placeholder="Descreva o produto, preparo, sabores etc. (Opcional)"
                          rows={7}
                        />
                        <div className="admin-product-descricao-editor-actions">
                          <span className="admin-help-text">{descricaoDraft.length}/400</span>
                          <div className="admin-product-descricao-editor-btns">
                            <button
                              type="button"
                              className="admin-btn admin-btn-ghost admin-btn-sm"
                              onClick={() => {
                                setDescricaoEditing(false);
                                setDescricaoDraft('');
                              }}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              className="admin-btn admin-btn-primary admin-btn-sm"
                              onClick={() => {
                                setForm((p) => ({ ...p, descricao: descricaoDraft }));
                                setDescricaoEditing(false);
                              }}
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p
                        className={
                          form.descricao?.trim()
                            ? 'admin-order-collapsed-summary'
                            : 'admin-order-collapsed-empty'
                        }
                      >
                        {form.descricao?.trim() || 'Nenhuma descrição cadastrada.'}
                      </p>
                    )}
                  </div>

                  {isProdutos ? (
                    <div className="admin-form-group admin-form-full admin-product-destaque-block">
                      <div className="admin-order-collapsed-head">
                        <label className="admin-label">Destaque</label>
                      </div>
                      {destaqueEditing ? (
                        <div className="admin-product-destaque-editor">
                          <input
                            id="admin-product-destaque"
                            className="admin-input"
                            maxLength={DESTAQUE_MAX_LENGTH}
                            value={destaqueDraft}
                            onChange={(e) =>
                              setDestaqueDraft(e.target.value.slice(0, DESTAQUE_MAX_LENGTH))
                            }
                            placeholder="Ex: Novo, Chef, Hit"
                            autoFocus
                          />
                          <div className="admin-product-destaque-editor-actions">
                            <span className="admin-help-text">
                              {destaqueDraft.length}/{DESTAQUE_MAX_LENGTH}
                            </span>
                            <div className="admin-product-destaque-editor-btns">
                              <button
                                type="button"
                                className="admin-btn admin-btn-ghost admin-btn-sm"
                                onClick={() => {
                                  setDestaqueEditing(false);
                                  setDestaqueDraft('');
                                }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-primary admin-btn-sm"
                                onClick={() => {
                                  setForm((p) => ({
                                    ...p,
                                    destaque: destaqueDraft.trim().slice(0, DESTAQUE_MAX_LENGTH),
                                  }));
                                  setDestaqueEditing(false);
                                  setDestaqueDraft('');
                                }}
                              >
                                Salvar
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : form.destaque?.trim() ? (
                        <div className="admin-product-destaque-preview-row">
                          <div className="admin-product-destaque-preview">
                            <ProductPromoChip label={form.destaque.trim()} />
                          </div>
                          <div className="admin-product-destaque-actions">
                            <button
                              type="button"
                              className="admin-product-destaque-icon-btn"
                              aria-label="Editar destaque"
                              onClick={() => {
                                setDestaqueDraft(form.destaque || '');
                                setDestaqueEditing(true);
                              }}
                            >
                              <i className="ph ph-pencil-simple" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="admin-product-destaque-icon-btn is-danger"
                              aria-label="Remover destaque"
                              onClick={() => setForm((p) => ({ ...p, destaque: '' }))}
                            >
                              <i className="ph ph-x" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="admin-link-btn admin-product-destaque-add"
                          onClick={() => {
                            setDestaqueDraft('');
                            setDestaqueEditing(true);
                          }}
                        >
                          + Adicionar
                        </button>
                      )}
                    </div>
                  ) : null}

                  <div className="admin-form-group admin-form-full admin-product-disponibilidade-block">
                    <label className="admin-label">Disponibilidade</label>
                    <div className="admin-product-disponibilidade-toggles" role="group" aria-label="Disponibilidade">
                      <button
                        type="button"
                        className={`admin-product-disponibilidade-toggle${form.entregaRetirada ? ' is-on' : ''}`}
                        onClick={() =>
                          setForm((p) => ({ ...p, entregaRetirada: !p.entregaRetirada }))
                        }
                        aria-pressed={form.entregaRetirada === true}
                      >
                        Entrega e retirada
                      </button>
                      <button
                        type="button"
                        className={`admin-product-disponibilidade-toggle${form.mesaBalcao ? ' is-on' : ''}`}
                        onClick={() => setForm((p) => ({ ...p, mesaBalcao: !p.mesaBalcao }))}
                        aria-pressed={form.mesaBalcao === true}
                      >
                        Mesa e Balcão
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="popup-details-col admin-preview-col admin-product-side-col">
              <div className="popup-header admin-preview-header">
                <div className="popup-header-title">Foto e opções</div>
              </div>
              <div className="popup-body admin-product-side-body">
                <label className="admin-upload-box admin-upload-box-compact">
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
                  <span className="admin-upload-caption">Adicione uma foto</span>
                  <small className="admin-upload-caption-hint">JPEG, PNG até 3MB</small>
                </label>

                {isProdutos && form.tipo === 'combo' ? (
                  <div className="admin-product-side-section admin-product-combo-side">
                    <section className="admin-product-combo-block">
                      <div className="admin-product-combo-head">
                        <div className="admin-form-section-title">Produtos do combo</div>
                        <button
                          type="button"
                          className="admin-btn admin-btn-ghost admin-icon-add-btn admin-product-combo-add"
                          onClick={() => setComboPickerOpen(true)}
                          title="Adicionar produto ao combo"
                          aria-label="Adicionar produto ao combo"
                        >
                          +
                        </button>
                      </div>
                      <div className="admin-combo-list admin-product-combo-list">
                        {normalizeComboConfig(form.comboConfig).itens.length ? (
                          normalizeComboConfig(form.comboConfig).itens.map((item) => (
                            <div key={item.produtoId} className="admin-product-combo-item">
                              <div className="admin-product-combo-item-main">
                                <span className="admin-product-combo-item-name">{item.nome}</span>
                                <span className="admin-product-combo-item-price">
                                  R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}
                                </span>
                              </div>
                              <input
                                type="number"
                                min={1}
                                className="admin-input admin-product-combo-qty"
                                value={item.quantidade}
                                onChange={(e) => updateComboItemQty(item.produtoId, e.target.value)}
                                aria-label={`Quantidade de ${item.nome}`}
                              />
                              <button
                                type="button"
                                className="admin-product-combo-remove"
                                onClick={() => removeComboItem(item.produtoId)}
                                title="Remover"
                                aria-label={`Remover ${item.nome}`}
                              >
                                ×
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="admin-help-text">Nenhum produto no combo ainda.</p>
                        )}
                      </div>
                    </section>

                    <section className="admin-product-combo-block admin-product-combo-calc">
                      <div className="admin-form-section-title">Cálculos do Combo</div>
                      <p className="admin-product-combo-calc-meta">
                        <span title="Soma de todos os produtos internos com quantidade.">
                          Valor total dos itens: R${' '}
                          {comboTotals.totalItens.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="admin-product-combo-calc-sep" aria-hidden="true">
                          •
                        </span>
                        <span title={`Sugestão com ${COMBO_SUGGESTED_DISCOUNT_PERCENT}% de desconto.`}>
                          Valor Sugerido: R$ {formatComboPriceBr(comboTotals.sugestao)}
                        </span>
                      </p>
                      <div className="admin-form-group admin-product-combo-price-field">
                        <label
                          className="admin-label"
                          title="Preço final de venda do combo. Pode ser alterado livremente."
                        >
                          Preço do combo
                        </label>
                        <input
                          className="admin-input"
                          inputMode="numeric"
                          value={normalizeComboConfig(form.comboConfig).precoCombo}
                          onChange={(e) => {
                            setComboPriceManual(true);
                            updateComboConfig(
                              (cfg) => ({ ...cfg, precoCombo: formatMoneyBrInput(e.target.value) }),
                              { manual: true }
                            );
                          }}
                          placeholder={formatComboPriceBr(comboTotals.sugestao)}
                        />
                      </div>
                      <p
                        className="admin-product-combo-calc-meta"
                        title="Diferença entre soma dos itens e preço final do combo."
                      >
                        Economia: R$ {comboTotals.economia.toFixed(2).replace('.', ',')}
                        {!Number.isNaN(comboTotals.precoCombo) && comboTotals.totalItens > 0
                          ? ` (${comboTotals.descontoPercent}% de desconto)`
                          : ' (0% de desconto)'}
                      </p>
                    </section>
                  </div>
                ) : null}

                {isProdutos && form.tipo !== 'combo' ? (
                  <div className="admin-product-side-section admin-product-links">
                    <div className="admin-product-addon-steps">
                      <div className="admin-product-config-copy">
                        <strong>Adicionais e complementos</strong>
                        <p>Cada passo vira uma pergunta no cardápio.</p>
                      </div>

                      <DraggableReorderList
                        items={addonPassos}
                        emptyLabel="Nenhum passo ainda."
                        onReorder={(next) =>
                          setForm((prev) => ({
                            ...prev,
                            adicionaisPassos: normalizeAddonPassos(
                              next.map((passo, index) => ({ ...passo, ordem: index }))
                            ),
                          }))
                        }
                        renderItem={(passo) => {
                          const cat = addonCategories.find((row) => row.id === passo.categoriaAdicionalId);
                          const totalInCat = addonItems.filter(
                            (item) =>
                              item.categoriaId === passo.categoriaAdicionalId && item.ativo !== false
                          ).length;
                          const selectedCount = passo.itemIds.length;
                          return (
                            <div className="admin-addon-passo-summary">
                              <button
                                type="button"
                                className="admin-addon-passo-summary-main"
                                onClick={() => {
                                  setEditingAddonPassoId(passo.id);
                                  setAddonPassoModalOpen(true);
                                }}
                              >
                                <strong>{passo.titulo || cat?.nome || 'Passo sem título'}</strong>
                                <span>
                                  {cat?.nome || 'Sem categoria'}
                                  {' · '}
                                  {passo.tipoSelecao === 'simples' ? 'Uma opção' : 'Várias opções'}
                                  {' · '}
                                  {selectedCount}/{totalInCat || selectedCount} itens
                                </span>
                              </button>
                              <button
                                type="button"
                                className="admin-addon-passo-summary-remove"
                                aria-label="Remover passo"
                                onClick={() => setRemovingAddonPassoId(passo.id)}
                              >
                                ×
                              </button>
                            </div>
                          );
                        }}
                      />

                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost admin-addon-passo-add"
                        onClick={() => {
                          setEditingAddonPassoId('');
                          setAddonPassoModalOpen(true);
                        }}
                      >
                        Adicionar passo
                      </button>
                    </div>

                    <div className="admin-product-config-row">
                      <div className="admin-product-config-copy">
                        <strong>Peça também</strong>
                        <p>Sugestões na sacola (máx. {MAX_PECA_TAMBEM}).</p>
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
                    <DraggableReorderList
                      className="admin-peca-tambem-draggable"
                      items={pecaTambemSelected}
                      emptyLabel="Nenhuma sugestão selecionada."
                      onReorder={(next) =>
                        setForm((prev) => ({
                          ...prev,
                          pecaTambemIds: next.map((product) => product.id),
                        }))
                      }
                      renderItem={(product) => (
                        <div className="admin-addon-passo-summary admin-peca-tambem-summary">
                          <div className="admin-peca-tambem-summary-main">
                            <strong>{product.nome}</strong>
                            <span>
                              R$ {Number(product.preco || 0).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="admin-addon-passo-summary-remove"
                            aria-label={`Remover ${product.nome}`}
                            onClick={() => removePecaTambem(product.id)}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    />
                  </div>
                ) : null}
              </div>
            </div>
            </div>
            <div className="popup-footer admin-product-popup-footer">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={requestCloseItemModal}>
                Cancelar
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveItem}>
                Salvar
              </button>
            </div>
          </div>

          {pecaTambemPickerOpen ? (
            <PizzaPecaTambemPickerModal
              products={pecaTambemCandidates}
              categories={pecaTambemCategories}
              selectedIds={normalizePecaTambemIds(form.pecaTambemIds)}
              onChange={(next) => {
                setSaveError('');
                setForm((prev) => ({ ...prev, pecaTambemIds: normalizePecaTambemIds(next) }));
              }}
              onClose={() => setPecaTambemPickerOpen(false)}
            />
          ) : null}
        </div>
        {pickerType ? (
          <div className="admin-picker-overlay" onClick={() => setPickerType('')}>
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
                    const allCatItems = addonItems.filter((item) => item.categoriaId === cat.id);
                    const catItems = filteredAddonItems(cat.id);
                    const categoryChecked = isAddonCategorySelected(cat.id, allCatItems);
                    if (pickerSearch.trim() && !cat.nome.toLowerCase().includes(pickerSearch.toLowerCase()) && !catItems.length) return null;
                    return (
                      <section key={cat.id} className="admin-picker-section">
                        <div className="admin-picker-section-head">
                          <div>
                            <h4>{cat.nome}</h4>
                            <span>{allCatItems.length} itens</span>
                          </div>
                          <button
                            type="button"
                            className={`admin-picker-check ${categoryChecked ? 'checked' : ''}`}
                            onClick={() => toggleAddonCategory(cat.id, allCatItems)}
                          >
                            {categoryChecked ? 'Categoria selecionada' : 'Selecionar categoria'}
                          </button>
                        </div>
                        {catItems.map((item) => {
                          const itemChecked = isAddonItemSelected(cat.id, item.id);
                          return (
                            <div key={item.id} className="admin-picker-item">
                              {item.imagemUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.imagemUrl} alt="" loading="lazy" decoding="async" />
                              ) : (
                                <ImagePlaceholder size={48} />
                              )}
                              <div>
                                <strong>{item.nome}</strong>
                                <p>{item.descricao || 'Sem descricao'}</p>
                              </div>
                              <span>R$ {Number(item.preco || 0).toFixed(2).replace('.', ',')}</span>
                              <button
                                type="button"
                                className={`admin-square-check ${itemChecked ? 'checked' : ''}`}
                                aria-label={`Selecionar ${item.nome}`}
                                onClick={() => toggleAddonItem(cat.id, item.id, allCatItems)}
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
          </div>
        ) : null}
        <AdminDiscardDialog
          open={itemDiscardOpen}
          onConfirm={confirmDiscardItemModal}
          onCancel={cancelDiscardItemModal}
        />
        <AdminComboProductPickerModal
          open={comboPickerOpen}
          products={comboCandidates}
          categories={categories}
          selectedIds={normalizeComboConfig(form.comboConfig).itens.map((item) => item.produtoId)}
          onToggle={toggleProdutoNoCombo}
          onSetSelectedIds={setComboSelectedIds}
          onClose={() => setComboPickerOpen(false)}
        />
        <ProductAddonPassoModal
          open={addonPassoModalOpen}
          passo={editingAddonPasso}
          categories={addonCategories.filter((cat) => cat.ativo !== false)}
          items={addonItems}
          onClose={() => {
            setAddonPassoModalOpen(false);
            setEditingAddonPassoId('');
          }}
          onSave={(passo) => {
            setForm((prev) => {
              const current = normalizeAddonPassos(prev.adicionaisPassos);
              const exists = current.some((row) => row.id === passo.id);
              const next = exists
                ? current.map((row) => (row.id === passo.id ? { ...passo, ordem: row.ordem } : row))
                : [...current, { ...passo, ordem: current.length }];
              return { ...prev, adicionaisPassos: normalizeAddonPassos(next) };
            });
            setAddonPassoModalOpen(false);
            setEditingAddonPassoId('');
          }}
        />
        <AdminConfirmDialog
          open={Boolean(removingAddonPassoId)}
          title="Remover passo?"
          message="Esse passo de adicionais será removido deste produto."
          confirmLabel="Remover"
          cancelLabel="Cancelar"
          danger
          onCancel={() => setRemovingAddonPassoId('')}
          onConfirm={() => {
            setForm((prev) => ({
              ...prev,
              adicionaisPassos: normalizeAddonPassos(
                (prev.adicionaisPassos || []).filter((passo) => passo.id !== removingAddonPassoId)
              ),
            }));
            setRemovingAddonPassoId('');
          }}
        />
        </>
      ) : null}

      {editingCategory ? (
        <div className="admin-confirm-overlay" onClick={() => setEditingCategory(null)}>
          <div
            className="admin-confirm-modal admin-category-edit-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {editingCategory.isNew
                ? isProdutos
                  ? 'Nova categoria'
                  : 'Nova categoria de adicional'
                : isProdutos
                  ? 'Editar categoria'
                  : 'Editar categoria de adicional'}
            </h3>
            <p>
              {editingCategory.isNew
                ? isProdutos
                  ? 'Defina o nome, o ícone e a exibição da categoria no cardápio.'
                  : 'Configure nome e regras padrão de seleção para esta categoria de adicionais.'
                : isProdutos
                  ? 'Altere o nome, o ícone e a exibição da categoria no cardápio.'
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
              <>
                <CategoryIconPicker
                  value={editingCategory.icone || 'burger'}
                  onChange={(icone) => setEditingCategory((cat) => ({ ...cat, icone }))}
                />
                <CategoryLayoutPicker
                  value={editingCategory.exibicaoCardapio || CATEGORY_LAYOUT_DEFAULT}
                  onChange={(exibicaoCardapio) =>
                    setEditingCategory((cat) => ({ ...cat, exibicaoCardapio }))
                  }
                />
              </>
            ) : (
              <div className="admin-addon-category-rules">
                <label className="admin-category-rule-option admin-category-rule-option-full">
                  <input
                    type="checkbox"
                    checked={editingCategory.obrigatorio === true}
                    onChange={(e) =>
                      setEditingCategory((cat) => ({ ...cat, obrigatorio: e.target.checked }))
                    }
                  />
                  <span>Obrigatório</span>
                </label>
                <div className="admin-category-rule-pair">
                  <label className="admin-category-rule-option">
                    <input
                      type="radio"
                      name="cat-tipo-selecao"
                      checked={editingCategory.tipoSelecao !== 'simples'}
                      onChange={() =>
                        setEditingCategory((cat) => ({
                          ...cat,
                          tipoSelecao: 'multipla',
                          max: Math.max(Number(cat.max || 1), Number(cat.min || 0)),
                        }))
                      }
                    />
                    <span>Múltipla escolha</span>
                  </label>
                  <label className="admin-category-rule-option">
                    <input
                      type="radio"
                      name="cat-tipo-selecao"
                      checked={editingCategory.tipoSelecao === 'simples'}
                      onChange={() =>
                        setEditingCategory((cat) => ({
                          ...cat,
                          tipoSelecao: 'simples',
                          min: Math.min(1, Number(cat.min || 0)),
                          max: 1,
                        }))
                      }
                    />
                    <span>Escolha simples</span>
                  </label>
                </div>
                <div className="admin-category-rule-pair">
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
      <AdminFaixaModal
        open={Boolean(faixaModal)}
        mode={faixaModal?.mode || 'create'}
        title={faixaModal?.mode === 'edit' ? 'Editar seção do cardápio' : 'Agrupar categorias'}
        initialNome={faixaModal?.nome || ''}
        initialLayout={faixaModal?.layout || CATEGORY_LAYOUT_DEFAULT}
        initialMemberIds={faixaModal?.membroIds || []}
        categories={categories}
        getCategoryId={(cat) => cat.id}
        getCategoryLabel={(cat) => cat.nome}
        confirmLabel={faixaModal?.mode === 'edit' ? 'Salvar seção' : 'Agrupar'}
        onClose={() => setFaixaModal(null)}
        onConfirm={confirmFaixaModal}
      />
    </div>
  );
}
