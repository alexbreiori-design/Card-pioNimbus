'use client';

import CardapioCategoryIcon from './CardapioCategoryIcon';

export default function CardapioCategoryChips({ sections = [], activeId = '', onSelect }) {
  function handleClick(sectionId, event) {
    const track = event.currentTarget.parentElement;
    const chip = event.currentTarget;
    if (track && chip) {
      const left = chip.offsetLeft - track.clientWidth / 2 + chip.offsetWidth / 2;
      track.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }
    onSelect?.(sectionId);
  }

  if (!sections.length) return null;

  return (
    <nav className="cardapio-v2-category-chips" aria-label="Categorias do cardápio">
      <div className="cardapio-v2-category-chips-track">
        {sections.map((section) => {
          const isActive = activeId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              data-section-id={section.id}
              className={`cardapio-v2-category-chip${isActive ? ' is-active' : ''}`}
              onClick={(event) => handleClick(section.id, event)}
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
