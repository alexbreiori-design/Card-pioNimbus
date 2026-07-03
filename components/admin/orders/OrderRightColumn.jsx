'use client';

import { useMemo, useState } from 'react';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import AdminIcon from '@/components/admin/AdminIcon';
import { productNeedsConfiguration } from '@/lib/admin/orderProductUtils';
import { currency } from './orderDraftUtils';

export default function OrderRightColumn({
  products,
  categorias = [],
  productSearch,
  setProductSearch,
  onAddProduct,
}) {
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const q = productSearch.trim().toLowerCase();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === 'todos' || p.categoriaId === categoryFilter;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        String(p.nome || '').toLowerCase().includes(q) ||
        String(p.descricao || '').toLowerCase().includes(q) ||
        String(p.medida || '').toLowerCase().includes(q)
      );
    });
  }, [products, categoryFilter, q]);

  return (
    <div className="admin-new-order-col admin-new-order-col-right">
      <div className="admin-order-product-search">
        <label className="admin-label">Buscar produtos</label>
        <div className="admin-pedidos-search-wrap compact">
          <AdminIcon name="search" />
          <input
            className="admin-input"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Digite o nome ou descrição do produto..."
          />
        </div>
        {categorias.length > 0 ? (
          <div className="admin-order-category-tabs">
            <button
              type="button"
              className={`admin-order-category-tab ${categoryFilter === 'todos' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('todos')}
            >
              Todos
            </button>
            {categorias.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`admin-order-category-tab ${categoryFilter === cat.id ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat.id)}
              >
                {cat.nome}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="admin-order-products-panel">
        <div className="admin-order-product-list">
          {filtered.length === 0 ? (
            <p className="admin-order-meta">Nenhum produto encontrado.</p>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="admin-order-product-row">
                <div className="admin-order-product-info">
                  <span className="admin-order-product-name">{p.nome}</span>
                  {productNeedsConfiguration(p) ? (
                    <div className="admin-order-meta">Montar antes de adicionar</div>
                  ) : null}
                  {p.medida ? <div className="admin-order-meta">{p.medida}</div> : null}
                  <div className="admin-order-product-price">{currency(p.preco)}</div>
                </div>
                <div className="admin-order-product-side">
                  {p.imagemUrl ? (
                    <img className="admin-order-product-thumb" src={p.imagemUrl} alt="" />
                  ) : (
                    <ImagePlaceholder size={52} />
                  )}
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary admin-icon-add-btn"
                    onClick={() => onAddProduct(p)}
                    aria-label={`Adicionar ${p.nome}`}
                  >
                    <AdminIcon name="plus" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
