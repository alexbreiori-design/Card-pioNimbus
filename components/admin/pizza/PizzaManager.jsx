'use client';

import { useState } from 'react';
import PizzaCategoriasPanel from './PizzaCategoriasPanel';
import PizzaSaboresPanel from './PizzaSaboresPanel';

const MODULE_TABS = [
  { id: 'categorias', label: 'Categorias' },
  { id: 'sabores', label: 'Sabores' },
];

export default function PizzaManager() {
  const [tab, setTab] = useState('categorias');

  return (
    <div className="admin-content admin-content-pedidos admin-catalog-page admin-pizza-page">
      <div className="admin-pizza-module-tabs" role="tablist" aria-label="Seções de pizza">
        {MODULE_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`admin-pizza-module-tab ${tab === item.id ? 'is-active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'sabores' ? <PizzaSaboresPanel /> : <PizzaCategoriasPanel />}
    </div>
  );
}
