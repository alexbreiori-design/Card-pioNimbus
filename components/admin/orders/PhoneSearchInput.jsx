'use client';

import { fmtPhone } from './orderDraftUtils';
import AdminIcon from '@/components/admin/AdminIcon';

export default function PhoneSearchInput({ value, onChange, onSearch, searching }) {
  return (
    <section className="admin-order-section admin-order-section-first">
      <h4 className="admin-order-section-title">
        <AdminIcon name="customer" />
        Contato do cliente
      </h4>
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
            <AdminIcon name="search" />
          </button>
        </div>
      </div>
    </section>
  );
}
