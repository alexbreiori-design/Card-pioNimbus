'use client';

import { CATEGORY_LAYOUT_OPTIONS } from '@/lib/cardapio/categoryLayouts';

function LayoutPreview({ layoutId }) {
  if (layoutId === 'lista') {
    return (
      <span className="admin-category-layout-preview is-lista" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </span>
    );
  }

  const count = layoutId === 'grid-3' ? 3 : layoutId === 'grid-5' ? 5 : 4;
  return (
    <span className={`admin-category-layout-preview is-grid is-count-${count}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

export default function CategoryLayoutPicker({ value, onChange }) {
  return (
    <div className="admin-category-layout-picker">
      <p className="admin-category-layout-picker-label">Exibição no cardápio</p>
      <p className="admin-cardapio-v2-exclusive-note">
        Disponível no <strong>novo cardápio online</strong>. No cardápio que seus clientes veem hoje,
        a exibição continua no formato padrão.
      </p>
      <div className="admin-category-layout-options">
        {CATEGORY_LAYOUT_OPTIONS.map((option) => {
          const isActive = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              className={`admin-category-layout-option${isActive ? ' active' : ''}`}
              onClick={() => onChange(option.id)}
              aria-pressed={isActive}
            >
              <LayoutPreview layoutId={option.id} />
              <span className="admin-category-layout-option-label">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
