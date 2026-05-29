'use client';

import { fmtPhone } from './orderDraftUtils';

export default function PhoneSearchInput({ value, onChange, onSearch, searching }) {
  return (
    <div className="admin-form-group">
      <label className="admin-label">Telefone</label>
      <div className="admin-input-icon-wrap">
        <input
          className="admin-input admin-input-with-icon"
          value={value}
          onChange={(e) => onChange(fmtPhone(e.target.value))}
          placeholder="(11) 98765-4321"
        />
        <button
          type="button"
          className="admin-input-icon-btn"
          onClick={onSearch}
          disabled={searching}
          title="Buscar cliente"
          aria-label="Buscar cliente"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
