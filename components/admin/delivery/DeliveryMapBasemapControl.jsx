'use client';

import { DELIVERY_BASEMAPS } from '@/lib/delivery/mapBasemaps';

export default function DeliveryMapBasemapControl({ value, onChange }) {
  return (
    <div className="admin-delivery-basemap-control" role="group" aria-label="Estilo do mapa">
      {DELIVERY_BASEMAPS.map((style) => (
        <button
          key={style.id}
          type="button"
          className={`admin-delivery-basemap-btn${value === style.id ? ' is-active' : ''}`}
          onClick={() => onChange(style.id)}
          aria-pressed={value === style.id}
        >
          {style.label}
        </button>
      ))}
    </div>
  );
}
