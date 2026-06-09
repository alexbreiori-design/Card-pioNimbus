'use client';

import { useMemo, useState } from 'react';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import AdminIcon from '@/components/admin/AdminIcon';
import { productNeedsConfiguration } from '@/lib/admin/orderProductUtils';
import { currency } from './orderDraftUtils';

export default function OrderRightColumn({
  draft,
  setDraft,
  products,
  categorias = [],
  productSearch,
  setProductSearch,
  onAddProduct,
  canSave,
  onRequestClose,
  onSave,
  onSavePrint,
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
      <div className="admin-new-order-right-top">
        <button type="button" className="admin-text-btn" onClick={onRequestClose}>
          Cancelar
        </button>
        <div className="admin-new-order-right-actions">
          <button
            type="button"
            className={`admin-btn admin-btn-primary ${canSave ? '' : 'admin-btn-inactive'}`}
            disabled={!canSave}
            onClick={onSavePrint}
          >
            <AdminIcon name="printer" />
            Salvar e imprimir
          </button>
          <button
            type="button"
            className={`admin-btn admin-btn-primary ${canSave ? '' : 'admin-btn-inactive'}`}
            disabled={!canSave}
            onClick={onSave}
          >
            Salvar
          </button>
        </div>
      </div>

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

        {draft.cart.length > 0 ? (
          <div className="admin-order-cart">
            <h4 className="admin-order-section-title">Itens do pedido</h4>
            {draft.cart.map((item) => (
              <div key={item.id} className="admin-order-cart-item">
                <div className="admin-order-cart-item-head">
                  <strong>
                    {item.qtd}x {item.nome}
                    {item.medida ? ` (${item.medida})` : ''}
                  </strong>
                  <span>{currency(item.qtd * item.preco)}</span>
                </div>
                {item.obs ? <p className="admin-order-cart-item-obs">{item.obs}</p> : null}
                <div className="admin-order-cart-item-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        cart: d.cart.map((x) =>
                          x.id === item.id ? { ...x, qtd: Math.max(1, x.qtd - 1) } : x
                        ),
                      }))
                    }
                  >
                    -
                  </button>
                  <span>{item.qtd}</span>
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        cart: d.cart.map((x) => (x.id === item.id ? { ...x, qtd: x.qtd + 1 } : x)),
                      }))
                    }
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn-danger"
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        cart: d.cart.filter((x) => x.id !== item.id),
                      }))
                    }
                  >
                    Remover
                  </button>
                </div>
                <input
                  className="admin-input"
                  placeholder="Observação do item"
                  value={item.obs}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      cart: d.cart.map((x) => (x.id === item.id ? { ...x, obs: e.target.value } : x)),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
