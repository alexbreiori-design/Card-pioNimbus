'use client';

import { useMemo, useState } from 'react';
import { filterCuponsByQuery } from '@/lib/cupons';
import { currency } from './orderDraftUtils';

export default function OrderCouponPicker({ draft, setDraft, cupons = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => filterCuponsByQuery(cupons, query), [cupons, query]);

  function selectCupom(cupom) {
    setDraft((d) => ({
      ...d,
      cupomId: cupom.id,
      cupomCodigo: cupom.codigo,
      cupomDesconto: Number(cupom.valorDesconto) || 0,
    }));
    setOpen(false);
    setQuery('');
  }

  function removeCupom() {
    setDraft((d) => ({
      ...d,
      cupomId: '',
      cupomCodigo: '',
      cupomDesconto: 0,
    }));
    setOpen(false);
    setQuery('');
  }

  if (draft.cupomId) {
    return (
      <div className="admin-order-coupon-applied">
        <div className="admin-order-coupon-applied-info">
          <span className="admin-label">Cupom</span>
          <strong>{draft.cupomCodigo}</strong>
          <span className="admin-order-coupon-discount">− {currency(draft.cupomDesconto)}</span>
        </div>
        <button type="button" className="admin-link-btn" onClick={removeCupom}>
          Remover
        </button>
      </div>
    );
  }

  return (
    <div className="admin-order-coupon-block">
      <div className="admin-order-coupon-trigger">
        <span className="admin-label admin-order-coupon-label">Adicionar cupom</span>
        <button type="button" className="admin-link-btn admin-order-coupon-add" onClick={() => setOpen((v) => !v)}>
          +Adicionar
        </button>
      </div>

      {open ? (
        <div className="admin-order-coupon-search">
          <input
            className="admin-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cupom disponível…"
            autoFocus
          />
          <div className="admin-order-coupon-results">
            {filtered.length === 0 ? (
              <p className="admin-help-text">Nenhum cupom disponível encontrado.</p>
            ) : (
              filtered.map((cupom) => (
                <button
                  key={cupom.id}
                  type="button"
                  className="admin-order-coupon-option"
                  onClick={() => selectCupom(cupom)}
                >
                  <span>{cupom.codigo}</span>
                  <small>{currency(cupom.valorDesconto)}</small>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
