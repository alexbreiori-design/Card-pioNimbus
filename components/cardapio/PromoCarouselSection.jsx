'use client';

import { useRef } from 'react';
import CategoryIcon from '@/components/admin/CategoryIcon';
import { PROMO_CATEGORY_NAME } from '@/lib/promocoes';
import { IconChevron } from './icons';
import PromoProductCard from './PromoProductCard';

export default function PromoCarouselSection({ products }) {
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
    <section className="promo-section-block" aria-label={PROMO_CATEGORY_NAME}>
      <div className="section-title-sticky promo-section-title">
        <CategoryIcon name="promo" size={18} className="section-title-icon" tinted />
        {PROMO_CATEGORY_NAME}
      </div>
      <div className="promo-carousel-wrap">
        <div className="promo-carousel-track" ref={scrollRef}>
          {products.map((p) => (
            <PromoProductCard key={`promo-${p.id}`} product={p} />
          ))}
        </div>
        <button
          type="button"
          className="promo-carousel-nav"
          onClick={scrollNext}
          aria-label="Ver mais promoções"
        >
          <IconChevron />
        </button>
      </div>
    </section>
  );
}
