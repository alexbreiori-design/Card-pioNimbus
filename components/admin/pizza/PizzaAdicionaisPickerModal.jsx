'use client';

import { useMemo } from 'react';
import AdminGridPickerModal from '@/components/admin/AdminGridPickerModal';
import { selectionFrom } from './pizzaAdminShared';

function normalizeSelection(value) {
  return selectionFrom(value);
}

export default function PizzaAdicionaisPickerModal({
  categories = [],
  items = [],
  selection,
  onChange,
  onClose,
  exibirFotos = true,
  onExibirFotosChange,
}) {
  const current = useMemo(() => normalizeSelection(selection), [selection]);

  const selectedIds = useMemo(() => {
    const ids = new Set(current.itemIds);
    current.categoriaIds.forEach((categoryId) => {
      items
        .filter((item) => item.categoriaId === categoryId)
        .forEach((item) => ids.add(item.id));
    });
    return [...ids];
  }, [current, items]);

  function rebuildSelection(nextSelectedIds) {
    const selectedSet = new Set(nextSelectedIds);
    const categoriaIds = [];
    const itemIds = [];

    categories.forEach((category) => {
      const categoryItems = items.filter((item) => item.categoriaId === category.id);
      if (!categoryItems.length) return;
      const allSelected = categoryItems.every((item) => selectedSet.has(item.id));
      if (allSelected) {
        categoriaIds.push(category.id);
        return;
      }
      categoryItems.forEach((item) => {
        if (selectedSet.has(item.id)) itemIds.push(item.id);
      });
    });

    onChange?.({ categoriaIds, itemIds });
  }

  function handleToggle(item) {
    const has = selectedIds.includes(item.id);
    const next = has
      ? selectedIds.filter((id) => id !== item.id)
      : [...selectedIds, item.id];
    rebuildSelection(next);
  }

  return (
    <AdminGridPickerModal
      open
      title="Adicionais vinculados"
      subtitle="Escolha categorias ou itens. Use o zoom para ajustar a grade."
      items={items}
      categories={categories}
      selectedIds={selectedIds}
      onToggle={handleToggle}
      onSetSelectedIds={rebuildSelection}
      onClose={onClose}
      searchPlaceholder="Pesquisar adicional..."
      emptyLabel="Nenhum adicional encontrado."
      concludeLabel="Salvar seleção"
      showPrice
      showCategoryChips
      showExibirFotos
      exibirFotos={exibirFotos !== false}
      onExibirFotosChange={onExibirFotosChange}
    />
  );
}
