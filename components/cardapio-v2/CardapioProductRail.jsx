'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CategoryIcon from '@/components/admin/CategoryIcon';
import { getCategoryLayoutConfig } from '@/lib/cardapio/categoryLayouts';
import CardapioProductCardV2 from './CardapioProductCardV2';
import CardapioProductCardV2List from './CardapioProductCardV2List';
import { V2Icon } from './CardapioV2Icons';

export default function CardapioProductRail({
  sectionId,
  label,
  items = [],
  categoryIcon = '',
  displayLayout = 'grid-4',
  vitrineNotice = '',
}) {
  const scrollRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const layoutConfig = useMemo(() => getCategoryLayoutConfig(displayLayout), [displayLayout]);
  const isListLayout = layoutConfig.mode === 'lista';
  const visibleCount = layoutConfig.visibleCount;
  const hasOverflow = items.length > visibleCount;

  const CardComponent = isListLayout ? CardapioProductCardV2List : CardapioProductCardV2;
  const cardSelector = isListLayout ? '.cardapio-v2-product-card-list' : '.cardapio-v2-product-card';

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(maxScroll > 4 && el.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    if (expanded || isListLayout) return undefined;
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return undefined;

    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro?.disconnect();
    };
  }, [expanded, isListLayout, items.length, displayLayout, updateScrollState]);

  function scrollBy(direction) {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector(cardSelector);
    const gap = 20;
    const amount = card ? card.getBoundingClientRect().width + gap : Math.floor(el.clientWidth * 0.75);
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  if (!items.length) return null;

  const collapsedItems = isListLayout ? items.slice(0, visibleCount) : items;
  const gridClassName = `cardapio-v2-rail-grid is-cols-${layoutConfig.gridColumns}${isListLayout ? ' is-list' : ''}`;

  return (
    <section
      className={`cardapio-v2-rail-section is-layout-${layoutConfig.id}`}
      id={sectionId}
      aria-label={label}
    >
      <div className="cardapio-v2-rail-head">
        <div className="cardapio-v2-rail-head-main">
          {categoryIcon ? (
            <CategoryIcon name={categoryIcon} size={18} className="cardapio-v2-rail-icon" tinted />
          ) : null}
          <h2 className="cardapio-v2-rail-title">{label}</h2>
        </div>
        {hasOverflow ? (
          <button
            type="button"
            className="cardapio-v2-rail-see-all"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? 'Ver menos' : 'Ver todos'}
            <V2Icon name={expanded ? 'caret-up' : 'caret-down'} />
          </button>
        ) : null}
      </div>
      {vitrineNotice ? <p className="cardapio-v2-rail-notice">{vitrineNotice}</p> : null}

      {expanded ? (
        <div className={gridClassName}>
          {items.map((product) => (
            <CardComponent key={product.id} product={product} layout="grid" />
          ))}
        </div>
      ) : isListLayout ? (
        <div className={gridClassName}>
          {collapsedItems.map((product) => (
            <CardComponent key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="cardapio-v2-rail-wrap">
          {canScrollPrev ? (
            <button
              type="button"
              className="cardapio-v2-rail-nav cardapio-v2-rail-nav--prev"
              onClick={() => scrollBy(-1)}
              aria-label={`Ver produtos anteriores em ${label}`}
            >
              <V2Icon name="caret-left" />
            </button>
          ) : null}
          <div className="cardapio-v2-rail-track" ref={scrollRef}>
            {items.map((product) => (
              <CardComponent key={product.id} product={product} />
            ))}
          </div>
          {canScrollNext ? (
            <button
              type="button"
              className="cardapio-v2-rail-nav cardapio-v2-rail-nav--next"
              onClick={() => scrollBy(1)}
              aria-label={`Ver mais em ${label}`}
            >
              <V2Icon name="caret-right" />
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
