'use client';

import { useMemo, useState } from 'react';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminProductPickerModal({
  title = 'Selecionar produto',
  subtitle = 'Busque e filtre por categoria.',
  products,
  categories = [],
  selectedId = '',
  onSelect,
  onClose,
  renderPrice,
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((item) => {
      const matchesCategory =
        categoryFilter === 'todos' ||
        item.categoriaId === categoryFilter ||
        (!item.categoriaId && categoryFilter === 'sem-categoria');
      if (!matchesCategory) return false;
      if (!q) return true;
      return (
        String(item.nome || '').toLowerCase().includes(q) ||
        String(item.descricao || '').toLowerCase().includes(q)
      );
    });
  }, [products, search, categoryFilter]);

  return (
    <div className="admin-picker-overlay" onClick={onClose}>
      <div className="admin-picker-modal admin-product-picker-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-picker-header">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
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
              const active = selectedId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-picker-select-row ${active ? 'is-active' : ''}`}
                  onClick={() => onSelect(item.id)}
                >
                  {item.imagemUrl ? <img src={item.imagemUrl} alt="" /> : <ImagePlaceholder size={48} />}
                  <div className="admin-picker-select-row-main">
                    <strong>{item.nome}</strong>
                    {item.descricao ? <p>{item.descricao}</p> : null}
                  </div>
                  <span className="admin-picker-select-row-price">
                    {renderPrice ? renderPrice(item) : formatCurrency(item.preco)}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="admin-empty-catalog">Nenhum produto encontrado.</div>
          )}
        </div>

        <div className="admin-picker-footer">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
