'use client';

import { useCardapio } from '@/context/CardapioContext';
import ProductCard from './ProductCard';

export default function ProductSections() {
  const { filteredProducts } = useCardapio();

  if (filteredProducts.length === 0) {
    return (
      <p style={{ color: 'var(--text-light)', padding: '20px 0', fontWeight: 300 }}>
        Nenhum produto encontrado.
      </p>
    );
  }

  return (
    <>
      {filteredProducts.map(({ category, items }) => (
        <div className="section-block" key={category}>
          <div className="section-title-sticky">{category}</div>
          <div className="product-grid">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
