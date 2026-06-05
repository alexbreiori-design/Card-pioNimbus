'use client';

import { useCardapio } from '@/context/CardapioContext';
import { PROMO_CATEGORY_NAME } from '@/lib/promocoes';
import CategoryIcon from '@/components/admin/CategoryIcon';
import ProductCard from './ProductCard';
import PromoCarouselSection from './PromoCarouselSection';

export default function ProductSections() {
  const { filteredProducts, promoProducts, selectedCategory, searchQuery } = useCardapio();

  const showPromoCarousel =
    promoProducts.length > 0 &&
    (selectedCategory === 'Todos' || selectedCategory === PROMO_CATEGORY_NAME);

  const gridSections = filteredProducts.filter(({ category }) => category !== PROMO_CATEGORY_NAME);

  const nothingToShow =
    !showPromoCarousel && gridSections.length === 0;

  if (nothingToShow) {
    return (
      <p style={{ color: 'var(--text-light)', padding: '20px 0', fontWeight: 300 }}>
        {searchQuery ? 'Nenhum produto encontrado.' : 'Nenhum produto disponível.'}
      </p>
    );
  }

  return (
    <>
      {showPromoCarousel ? <PromoCarouselSection products={promoProducts} /> : null}
      {gridSections.map(({ category, items, categoryIcon }) => (
        <div className="section-block" key={category}>
          <div className="section-title-sticky">
            {categoryIcon ? (
              <CategoryIcon name={categoryIcon} size={18} className="section-title-icon" tinted />
            ) : null}
            {category}
          </div>
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
