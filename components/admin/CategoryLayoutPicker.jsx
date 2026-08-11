'use client';

import { CATEGORY_LAYOUT_OPTIONS } from '@/lib/cardapio/categoryLayouts';

function LayoutPreview({ layoutId }) {
  if (layoutId === 'lista' || layoutId === 'lista-1') {
    return (
      <span
        className={`admin-category-layout-preview is-lista${layoutId === 'lista-1' ? ' is-lista-1' : ''}`}
        aria-hidden="true"
      >
        <span />
        <span />
        {layoutId === 'lista' ? <span /> : null}
        {layoutId === 'lista' ? <span /> : null}
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
