'use client';

import { useCardapio } from '@/context/CardapioContext';
import { IconSearch } from './icons';

export default function FiltersBar() {
  const {
    selectedCategory,
    categoryMenuOpen,
    setCategoryMenuOpen,
    CATEGORIES,
    selectCategory,
    searchQuery,
    setSearchQuery,
  } = useCardapio();

  const catLabel =
    selectedCategory === 'Todos' ? 'Lista de categorias' : selectedCategory;

  return (
    <div className="filters-bar">
      <div className="dropdown-wrapper">
        <button
          type="button"
          className="category-dropdown"
          onClick={() => setCategoryMenuOpen((v) => !v)}
        >
          <span>{catLabel}</span>
          <svg viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div className={`dropdown-menu ${categoryMenuOpen ? 'open' : ''}`}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat}
              className="dropdown-item"
              onClick={() => selectCategory(cat)}
              role="button"
              tabIndex={0}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>
      <div className="search-spacer" />
      <div className="search-field">
        <IconSearch />
        <input
          type="text"
          placeholder="Buscar produto"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );
}
