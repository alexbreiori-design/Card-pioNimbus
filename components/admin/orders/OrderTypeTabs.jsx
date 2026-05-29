'use client';

import { ORDER_TYPES } from './orderDraftUtils';

export default function OrderTypeTabs({ value, onChange }) {
  return (
    <div className="admin-tabs admin-tabs-pedidos admin-product-type-tabs admin-order-type-tabs">
      {ORDER_TYPES.map((t) => (
        <button
          key={t.value}
          type="button"
          className={`admin-tab ${value === t.value ? 'active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
