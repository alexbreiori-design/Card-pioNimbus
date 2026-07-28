'use client';

import { useMemo, useState } from 'react';
import ImagePlaceholder from '@/components/admin/ImagePlaceholder';
import AdminIcon from '@/components/admin/AdminIcon';
import { useAdminData } from '@/hooks/useAdminData';
import { productNeedsConfiguration } from '@/lib/admin/orderProductUtils';
import { isMarmitaSegment, isPizzariaSegment } from '@/lib/empresaSegmentos';
import { MARMITA_VIRTUAL_CATEGORY_ID } from '@/lib/marmita/marmitaCardapio';
import { PIZZA_VIRTUAL_CATEGORY_ID } from '@/lib/pizza/pizzaIds';
import { currency } from './orderDraftUtils';

function productGroupRank(product, segmento) {
  const isPizza =
    product.tipo === 'pizza' || product.categoriaId === PIZZA_VIRTUAL_CATEGORY_ID;
  const isMarmita =
    product.tipo === 'marmita' || product.categoriaId === MARMITA_VIRTUAL_CATEGORY_ID;
  const pizzaSeg = isPizzariaSegment(segmento);
  const marmitaSeg = isMarmitaSegment(segmento);

  if (pizzaSeg && !marmitaSeg) {
    if (isPizza) return 0;
    if (isMarmita) return 1;
    return 2;
  }
  if (marmitaSeg && !pizzaSeg) {
    if (isMarmita) return 0;
    if (isPizza) return 1;
    return 2;
  }
  // Modelo ou ambos: pizza → marmita → demais
  if (isPizza) return 0;
  if (isMarmita) return 1;
  return 2;
}

export default function OrderRightColumn({
  products,
  categorias = [],
  productSearch,
  setProductSearch,
  onAddProduct,
}) {
  const { data } = useAdminData();
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const q = productSearch.trim().toLowerCase();
  const segmento = data.loja?.segmento;

  const filtered = useMemo(() => {
    const catRank = new Map(categorias.map((cat, index) => [cat.id, index]));
    return products
      .map((product, index) => ({ product, index }))
      .filter(({ product }) => {
        const matchCat =
          categoryFilter === 'todos' || product.categoriaId === categoryFilter;
        if (!matchCat) return false;
        if (!q) return true;
        return (
          String(product.nome || '').toLowerCase().includes(q) ||
          String(product.descricao || '').toLowerCase().includes(q) ||
          String(product.medida || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const groupA = productGroupRank(a.product, segmento);
        const groupB = productGroupRank(b.product, segmento);
        if (groupA !== groupB) return groupA - groupB;
        const catA = catRank.get(a.product.categoriaId) ?? 9999;
        const catB = catRank.get(b.product.categoriaId) ?? 9999;
        if (catA !== catB) return catA - catB;
        return a.index - b.index;
      })
      .map(({ product }) => product);
  }, [products, categorias, categoryFilter, q, segmento]);

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
        {filtered.length === 0 ? (
          <p className="admin-order-meta">Nenhum produto encontrado.</p>
        ) : (
          <div className="admin-order-product-grid">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                className="admin-order-product-card"
                onClick={() => onAddProduct(p)}
                title={productNeedsConfiguration(p) ? `Montar ${p.nome}` : `Adicionar ${p.nome}`}
              >
                <div className="admin-order-product-card-media">
                  {p.imagemUrl ? (
                    <img className="admin-order-product-card-img" src={p.imagemUrl} alt="" />
                  ) : (
                    <ImagePlaceholder size={96} />
                  )}
                </div>
                <div className="admin-order-product-card-body">
                  <span className="admin-order-product-card-name">{p.nome}</span>
                  {productNeedsConfiguration(p) ? (
                    <span className="admin-order-product-card-hint">Montar</span>
                  ) : null}
                  <span className="admin-order-product-card-price">{currency(p.preco)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
