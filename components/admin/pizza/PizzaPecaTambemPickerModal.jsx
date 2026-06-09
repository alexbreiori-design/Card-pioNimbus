'use client';

import { useMemo, useState } from 'react';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import { MAX_PECA_TAMBEM } from '@/lib/productSuggestions';

export default function PizzaPecaTambemPickerModal({
  products,
  categories,
  selectedIds,
  onChange,
  onClose,
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((item) => {
      const matchesCategory =
        categoryFilter === 'todos' || item.categoriaId === categoryFilter;
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        item.nome.toLowerCase().includes(q) ||
        String(item.descricao || '').toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter]);

  function toggleProduct(productId) {
    const has = selectedSet.has(productId);
    if (has) {
      onChange(selectedIds.filter((id) => id !== productId));
      return;
    }
    if (selectedIds.length >= MAX_PECA_TAMBEM) return;
    onChange([...selectedIds, productId]);
  }

  return (
    <div className="admin-picker-modal admin-pizza-peca-picker" onClick={(event) => event.stopPropagation()}>
      <div className="admin-picker-header">
        <div>
          <h3>Peça também</h3>
          <p>Selecione até {MAX_PECA_TAMBEM} produtos sugeridos após a montagem da pizza.</p>
        </div>
        <button type="button" className="admin-picker-close" onClick={onClose}>
          x
        </button>
      </div>

      <div className="admin-picker-search-row">
        <input
          className="admin-input"
          placeholder="Pesquisar produto..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {categories.length ? (
        <div className="admin-picker-category-chips">
          <button
            type="button"
            className={`admin-catalog-cat-pill ${categoryFilter === 'todos' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('todos')}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`admin-catalog-cat-pill ${categoryFilter === cat.id ? 'active' : ''}`}
              onClick={() => setCategoryFilter(cat.id)}
            >
              {cat.nome}
            </button>
          ))}
        </div>
      ) : null}

      <div className="admin-picker-content">
        {filteredProducts.length ? (
          filteredProducts.map((item) => {
            const checked = selectedSet.has(item.id);
            const atLimit = !checked && selectedIds.length >= MAX_PECA_TAMBEM;
            return (
              <div key={item.id} className={`admin-picker-item ${atLimit ? 'is-disabled' : ''}`}>
                <button
                  type="button"
                  className={`admin-square-check ${checked ? 'checked' : ''}`}
                  aria-label={`Selecionar ${item.nome}`}
                  disabled={atLimit}
                  onClick={() => toggleProduct(item.id)}
                >
                  {checked ? '✓' : ''}
                </button>
                {item.imagemUrl ? <img src={item.imagemUrl} alt="" /> : <ImagePlaceholder size={48} />}
                <div>
                  <strong>{item.nome}</strong>
                  <p>{item.descricao || 'Sem descrição'}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="admin-empty-catalog">Nenhum produto encontrado.</div>
        )}
      </div>

      <div className="admin-picker-footer">
        <span className="admin-picker-selection-count">
          {selectedIds.length} de {MAX_PECA_TAMBEM} selecionados
        </span>
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
