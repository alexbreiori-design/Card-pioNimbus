'use client';

import { useMemo, useState } from 'react';
import { useCardapio } from '@/context/CardapioContext';
import { PROMO_CATEGORY_NAME } from '@/lib/promocoes';
import { isReviewsEnabledOnCardapio } from '@/lib/cardapioV2Reviews';
import CategoryIcon from '@/components/admin/CategoryIcon';
import MenuImageArea from '@/components/cardapio/MenuImageArea';
import { V2Icon } from './CardapioV2Icons';
import {
  CARDAPIO_V2_SECTION,
  cardapioV2CategorySectionId,
  scrollToCardapioV2Section,
} from './cardapioV2Sections';

export default function CardapioSidebar() {
  const { storeConfig, CATEGORIES, promoProducts, filteredProducts } = useCardapio();
  const [activeId, setActiveId] = useState(CARDAPIO_V2_SECTION.inicio);

  const iconByCategory = useMemo(() => {
    const map = {};
    (filteredProducts || []).forEach(({ category, categoryIcon }) => {
      if (category && categoryIcon) map[category] = categoryIcon;
    });
    return map;
  }, [filteredProducts]);

  const categoryLinks = useMemo(() => {
    const fromCatalog = (CATEGORIES || []).filter(
      (cat) => cat && cat !== 'Todos' && cat !== PROMO_CATEGORY_NAME
    );
    const links = [];
    if (promoProducts?.length) {
      links.push({
        id: cardapioV2CategorySectionId(PROMO_CATEGORY_NAME),
        label: PROMO_CATEGORY_NAME,
        categoryIcon: 'promo',
      });
    }
    fromCatalog.forEach((cat) => {
      links.push({
        id: cardapioV2CategorySectionId(cat),
        label: cat,
        categoryIcon: iconByCategory[cat] || 'burger',
      });
    });
    return links;
  }, [CATEGORIES, promoProducts, iconByCategory]);

  function navigate(sectionId) {
    setActiveId(sectionId);
    scrollToCardapioV2Section(sectionId);
  }

  async function handleShare() {
    const url = window.location.href;
    const title = storeConfig?.nome || 'Cardápio';
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* cancelado */
      }
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  }

  const reviewsEnabled = isReviewsEnabledOnCardapio(storeConfig);

  return (
    <aside className="cardapio-v2-sidebar" aria-label="Navegação do cardápio">
      <div className="cardapio-v2-sidebar-brand">
        <MenuImageArea
          imageUrl={storeConfig?.logoUrl}
          className="cardapio-v2-sidebar-logo"
          alt={storeConfig?.nome || 'Logo da loja'}
          sizes="200px"
        />
      </div>

      <nav className="cardapio-v2-sidebar-nav">
        <ul className="cardapio-v2-sidebar-list">
          <li>
            <button
              type="button"
              className={`cardapio-v2-sidebar-link${activeId === CARDAPIO_V2_SECTION.inicio ? ' is-active' : ''}`}
              onClick={() => navigate(CARDAPIO_V2_SECTION.inicio)}
            >
              <V2Icon name="home" />
              <span>Início</span>
            </button>
          </li>
          {categoryLinks.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`cardapio-v2-sidebar-link${activeId === item.id ? ' is-active' : ''}`}
                onClick={() => navigate(item.id)}
              >
                <CategoryIcon
                  name={item.categoryIcon}
                  size={18}
                  className="cardapio-v2-sidebar-cat-icon"
                  tinted
                />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
          {reviewsEnabled ? (
            <li>
              <button
                type="button"
                className={`cardapio-v2-sidebar-link${activeId === CARDAPIO_V2_SECTION.avaliacoes ? ' is-active' : ''}`}
                onClick={() => navigate(CARDAPIO_V2_SECTION.avaliacoes)}
              >
                <V2Icon name="reviews" />
                <span>Avaliações</span>
              </button>
            </li>
          ) : null}
          <li>
            <button
              type="button"
              className={`cardapio-v2-sidebar-link${activeId === CARDAPIO_V2_SECTION.informacoes ? ' is-active' : ''}`}
              onClick={() => navigate(CARDAPIO_V2_SECTION.informacoes)}
            >
              <V2Icon name="info" />
              <span>Informações</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="cardapio-v2-sidebar-spacer" aria-hidden="true" />

      <div className="cardapio-v2-sidebar-footer">
        <button type="button" className="cardapio-v2-sidebar-share" onClick={handleShare}>
          <V2Icon name="share" />
          <span>Compartilhar</span>
        </button>
      </div>
    </aside>
  );
}
