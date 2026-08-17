'use client';

import { useEffect, useRef } from 'react';
import CardapioCategoryIcon from '@/components/cardapio/CardapioCategoryIcon';

export default function CardapioCategoryChips({ sections = [], activeId = '', onSelect }) {
  const trackRef = useRef(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !activeId) return;
    const chip = track.querySelector(`[data-section-id="${CSS.escape(activeId)}"]`);
    if (!chip) return;
    const left = chip.offsetLeft - track.clientWidth / 2 + chip.offsetWidth / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [activeId]);

  function handleClick(sectionId) {
    onSelect?.(sectionId);
  }

  if (!sections.length) return null;

  return (
    <nav className="cardapio-v2-category-chips" aria-label="Categorias do cardápio">
      <div className="cardapio-v2-category-chips-track" ref={trackRef}>
        {sections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              data-section-id={section.id}
              className={`cardapio-v2-category-chip${isActive ? ' is-active' : ''}`}
              onClick={() => handleClick(section.id)}
            >
              <CardapioCategoryIcon
                name={section.categoryIcon || 'burger'}
                size={16}
                className="cardapio-v2-category-chip-cat-icon"
                tinted
              />
              <span className="cardapio-v2-category-chip-label">{section.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
