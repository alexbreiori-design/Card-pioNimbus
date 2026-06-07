'use client';

import { useRef } from 'react';
import CategoryIcon from '@/components/admin/CategoryIcon';
import { IconChevron } from './icons';
import PromoProductCard from './PromoProductCard';

export default function MarmitaCarouselSection({ title, categoryIcon, products, vitrineNotice = '' }) {
  const scrollRef = useRef(null);

  if (!products?.length) return null;

  function scrollNext() {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.promo-product-card');
    const gap = 12;
    const amount = card ? card.getBoundingClientRect().width + gap : Math.floor(el.clientWidth * 0.85);
    el.scrollBy({ left: amount, behavior: 'smooth' });
  }

  return (
    <section className="promo-section-block marmita-section-block" aria-label={title}>
      <div className="section-title-sticky promo-section-title">
        {categoryIcon ? (
          <CategoryIcon name={categoryIcon} size={18} className="section-title-icon" tinted />
        ) : null}
        {title}
      </div>
      {vitrineNotice ? <p className="marmita-vitrine-notice">{vitrineNotice}</p> : null}
      <div className="promo-carousel-wrap">
        <div className="promo-carousel-track" ref={scrollRef}>
          {products.map((product) => (
            <PromoProductCard key={product.id} product={product} />
          ))}
        </div>
        <button
          type="button"
          className="promo-carousel-nav"
          onClick={scrollNext}
          aria-label={`Ver mais itens de ${title}`}
        >
          <IconChevron />
        </button>
      </div>
    </section>
  );
}
