'use client';

import { useMemo, useState } from 'react';
import { selectionFrom } from './pizzaAdminShared';

function normalizeSelection(value) {
  return selectionFrom(value);
}

export default function PizzaAdicionaisPickerModal({
  categories,
  items,
  selection,
  onChange,
  onClose,
}) {
  const [search, setSearch] = useState('');
  const current = useMemo(() => normalizeSelection(selection), [selection]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories
      .map((category) => {
        const categoryItems = items.filter((item) => item.categoriaId === category.id);
        const filteredItems = categoryItems.filter(
          (item) =>
            !q ||
            item.nome.toLowerCase().includes(q) ||
            String(item.descricao || '').toLowerCase().includes(q) ||
            category.nome.toLowerCase().includes(q)
        );
        return { category, items: filteredItems };
      })
      .filter((group) => group.items.length > 0);
  }, [categories, items, search]);

  function isCategoryFullySelected(categoryId, categoryItems) {
    if (current.categoriaIds.includes(categoryId)) return true;
    const activeIds = categoryItems.map((item) => item.id);
    return activeIds.length > 0 && activeIds.every((id) => current.itemIds.includes(id));
  }

  function isItemSelected(categoryId, itemId, categoryItems) {
    if (current.categoriaIds.includes(categoryId)) return true;
    return current.itemIds.includes(itemId);
  }

  function toggleCategory(categoryId, categoryItems) {
    const itemIdsInCategory = new Set(categoryItems.map((item) => item.id));
    const fullySelected = isCategoryFullySelected(categoryId, categoryItems);

    if (fullySelected) {
      onChange({
        categoriaIds: current.categoriaIds.filter((id) => id !== categoryId),
        itemIds: current.itemIds.filter((id) => !itemIdsInCategory.has(id)),
      });
      return;
    }

    onChange({
      categoriaIds: [...current.categoriaIds.filter((id) => id !== categoryId), categoryId],
      itemIds: current.itemIds.filter((id) => !itemIdsInCategory.has(id)),
    });
  }

  function toggleItem(categoryId, itemId, categoryItems) {
    const itemIdsInCategory = categoryItems.map((item) => item.id);

    if (current.categoriaIds.includes(categoryId)) {
      const nextItemIds = itemIdsInCategory.filter((id) => id !== itemId);
      onChange({
        categoriaIds: current.categoriaIds.filter((id) => id !== categoryId),
        itemIds: [
          ...current.itemIds.filter((id) => !itemIdsInCategory.includes(id)),
          ...nextItemIds,
        ],
      });
      return;
    }

    const has = current.itemIds.includes(itemId);
    let nextItemIds = has
      ? current.itemIds.filter((id) => id !== itemId)
      : [...current.itemIds, itemId];

    const allSelected = itemIdsInCategory.every((id) => nextItemIds.includes(id));
    if (allSelected) {
      onChange({
        categoriaIds: [...current.categoriaIds, categoryId],
        itemIds: nextItemIds.filter((id) => !itemIdsInCategory.includes(id)),
      });
      return;
    }

    onChange({
      categoriaIds: current.categoriaIds.filter((id) => id !== categoryId),
      itemIds: nextItemIds,
    });
  }

  return (
    <div className="admin-picker-modal admin-pizza-adicionais-picker" onClick={(event) => event.stopPropagation()}>
      <div className="admin-picker-header">
        <div>
          <h3>Adicionais vinculados</h3>
          <p>Escolha categorias inteiras ou personalize item a item.</p>
        </div>
        <button type="button" className="admin-picker-close" onClick={onClose}>
          x
        </button>
      </div>

      <div className="admin-picker-search-row">
        <input
          className="admin-input"
          placeholder="Pesquisar adicional..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="admin-picker-content admin-picker-content-grouped">
        {grouped.length ? (
          grouped.map(({ category, items: categoryItems }) => {
            const categoryChecked = isCategoryFullySelected(category.id, categoryItems);
            return (
              <section key={category.id} className="admin-picker-addon-group">
                <div className="admin-picker-addon-group-head">
                  <button
                    type="button"
                    className={`admin-square-check ${categoryChecked ? 'checked' : ''}`}
                    aria-label={`Selecionar categoria ${category.nome}`}
                    onClick={() => toggleCategory(category.id, categoryItems)}
                  >
                    {categoryChecked ? '✓' : ''}
                  </button>
                  <strong>{category.nome}</strong>
                </div>
                {categoryItems.map((item) => {
                  const checked = isItemSelected(category.id, item.id, categoryItems);
                  return (
                    <div key={item.id} className="admin-picker-item admin-picker-item-nested">
                      <button
                        type="button"
                        className={`admin-square-check ${checked ? 'checked' : ''}`}
                        aria-label={`Selecionar ${item.nome}`}
                        onClick={() => toggleItem(category.id, item.id, categoryItems)}
                      >
                        {checked ? '✓' : ''}
                      </button>
                      <div>
                        <strong>{item.nome}</strong>
                        {item.descricao ? <p>{item.descricao}</p> : null}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })
        ) : (
          <div className="admin-empty-catalog">Nenhum adicional encontrado.</div>
        )}
      </div>

      <div className="admin-picker-footer">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
          Salvar seleção
        </button>
      </div>
    </div>
  );
}
