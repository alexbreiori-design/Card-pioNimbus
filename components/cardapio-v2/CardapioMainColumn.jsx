'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { PROMO_CATEGORY_NAME } from '@/lib/promocoes';
import { CATEGORY_LAYOUT_DEFAULT } from '@/lib/cardapio/categoryLayouts';
import { cardapioV2CategorySectionId, scrollToCardapioV2Section } from './cardapioV2Sections';
import CardapioHeroBanner from './CardapioHeroBanner';
import CardapioCategoryChips from './CardapioCategoryChips';
import CardapioProductRail from './CardapioProductRail';
import CardapioInfoFooter from './CardapioInfoFooter';
import CardapioReviewsSection from './CardapioReviewsSection';

export default function CardapioMainColumn() {
  const { filteredProducts, promoProducts, searchQuery, categoryLayoutsByName } = useCardapio();
  const [activeSectionId, setActiveSectionId] = useState('');
  const scrollLockRef = useRef(false);

  const sections = useMemo(() => {
    const list = [];

    if (promoProducts?.length) {
      list.push({
        id: cardapioV2CategorySectionId(PROMO_CATEGORY_NAME),
        label: PROMO_CATEGORY_NAME,
        items: promoProducts,
        categoryIcon: 'promo',
        displayLayout: categoryLayoutsByName[PROMO_CATEGORY_NAME] || CATEGORY_LAYOUT_DEFAULT,
        isMarmitaSection: false,
      });
    }

    filteredProducts
      .filter(({ category }) => category !== PROMO_CATEGORY_NAME)
      .forEach(({ category, items, categoryIcon, categoryLayout, isMarmitaSection }) => {
        if (!items?.length) return;
        list.push({
          id: cardapioV2CategorySectionId(category),
          label: category,
          items,
          categoryIcon,
          displayLayout: categoryLayout || CATEGORY_LAYOUT_DEFAULT,
          isMarmitaSection,
        });
      });

    return list;
  }, [filteredProducts, promoProducts]);

  useEffect(() => {
    if (!sections.length) {
      setActiveSectionId('');
      return;
    }
    if (!activeSectionId || !sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  useEffect(() => {
    if (!sections.length || typeof IntersectionObserver === 'undefined') return undefined;

    const visible = new Map();

    const observer = new IntersectionObserver(
      (entries) => {
        if (scrollLockRef.current) return;

        entries.forEach((entry) => {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let bestId = '';
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (bestId && bestRatio > 0.15) {
          setActiveSectionId(bestId);
        }
      },
      {
        root: null,
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      }
    );

    sections.forEach((section) => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  function handleChipSelect(sectionId) {
    scrollLockRef.current = true;
    setActiveSectionId(sectionId);
    scrollToCardapioV2Section(sectionId);
    window.setTimeout(() => {
      scrollLockRef.current = false;
    }, 900);
  }

  const nothingToShow = sections.length === 0;

  return (
    <main className="cardapio-v2-main" id="cardapio-v2-conteudo">
      <CardapioHeroBanner />

      {!nothingToShow ? (
        <CardapioCategoryChips
          sections={sections}
          activeId={activeSectionId}
          onSelect={handleChipSelect}
        />
      ) : null}

      {nothingToShow ? (
        <section className="cardapio-v2-catalog-empty" aria-live="polite">
          <p>
            {searchQuery
              ? 'Nenhum produto encontrado para sua busca.'
              : 'Nenhum produto disponível no cardápio.'}
          </p>
        </section>
      ) : (
        sections.map((section) => {
          const vitrineNotice =
            section.isMarmitaSection &&
            section.items.some((product) => product.isMarmitaVitrine)
              ? 'Cardápio de referência — pedidos disponíveis nos dias de funcionamento.'
              : '';

          return (
            <CardapioProductRail
              key={section.id}
              sectionId={section.id}
              label={section.label}
              items={section.items}
              categoryIcon={section.categoryIcon}
              displayLayout={section.displayLayout}
              vitrineNotice={vitrineNotice}
            />
          );
        })
      )}

      <CardapioReviewsSection />

      <CardapioInfoFooter />
    </main>
  );
}
