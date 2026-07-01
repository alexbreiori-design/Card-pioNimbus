'use client';

import { useMemo } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { PROMO_CATEGORY_NAME } from '@/lib/promocoes';
import { CATEGORY_LAYOUT_DEFAULT } from '@/lib/cardapio/categoryLayouts';
import { cardapioV2CategorySectionId, scrollToCardapioV2Section } from './cardapioV2Sections';
import { useCardapioV2ScrollSpy } from './useCardapioV2ScrollSpy';
import CardapioHeroBanner from './CardapioHeroBanner';
import CardapioCategoryChips from './CardapioCategoryChips';
import CardapioProductRail from './CardapioProductRail';
import CardapioInfoFooter from './CardapioInfoFooter';
import CardapioReviewsSection from './CardapioReviewsSection';

export default function CardapioMainColumn() {
  const { filteredProducts, promoProducts, searchQuery, categoryLayoutsByName } = useCardapio();

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
  }, [filteredProducts, promoProducts, categoryLayoutsByName]);

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);

  const { activeId: activeSectionId, setActiveId: setActiveSectionId, lockScrollSpy } =
    useCardapioV2ScrollSpy(sectionIds, {
      initialId: sections[0]?.id || '',
    });

  function handleChipSelect(sectionId) {
    lockScrollSpy();
    setActiveSectionId(sectionId);
    scrollToCardapioV2Section(sectionId);
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
