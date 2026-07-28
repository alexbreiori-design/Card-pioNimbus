'use client';

import { useEffect, useState } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';
import OrderCouponPicker from './OrderCouponPicker';

const TABS = [
  { id: 'desconto', label: 'Desconto' },
  { id: 'acrescimo', label: 'Acréscimo' },
  { id: 'cupom', label: 'Cupom' },
];

function AmountTypeToggle({ value, onChange }) {
  return (
    <div className="admin-order-amount-type" role="group" aria-label="Tipo de valor">
      <button
        type="button"
        className={`admin-order-amount-type-btn${value === '%' ? ' is-active' : ''}`}
        onClick={() => onChange('%')}
        aria-pressed={value === '%'}
      >
        %
      </button>
      <button
        type="button"
        className={`admin-order-amount-type-btn${value === '$' ? ' is-active' : ''}`}
        onClick={() => onChange('$')}
        aria-pressed={value === '$'}
      >
        R$
      </button>
    </div>
  );
}

export default function OrderAdjustmentsModal({ draft, setDraft, cupons = [], onClose }) {
  const [tab, setTab] = useState('desconto');

  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      onClose();
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      className="admin-confirm-overlay admin-order-aux-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`admin-confirm-modal admin-order-aux-modal admin-order-aux-modal-sm${
          tab === 'cupom' ? ' is-coupon-tab' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-adj-modal-title"
      >
        <div className="admin-order-aux-modal-head">
          <h3 id="order-adj-modal-title">Ajustes financeiros</h3>
          <button type="button" className="admin-order-aux-close" onClick={onClose} aria-label="Fechar">
            <AdminIcon name="close" />
          </button>
        </div>

        <div className="admin-order-adj-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`admin-order-adj-tab${tab === t.id ? ' is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="admin-order-aux-modal-body">
          {tab === 'desconto' ? (
            <div className="admin-order-adj-panel">
              <div className="admin-order-adj-value-row">
                <div className="admin-order-adj-value-field">
                  <label className="admin-label">Valor do desconto</label>
                  {draft.descontoTipo === '%' ? (
                    <input
                      className="admin-input"
                      inputMode="decimal"
                      value={draft.desconto}
                      onChange={(e) => setDraft((d) => ({ ...d, desconto: e.target.value }))}
                      placeholder="0"
                    />
                  ) : (
                    <div className="admin-input-prefix-wrap">
                      <span className="admin-input-prefix" aria-hidden="true">
                        $
                      </span>
                      <input
                        className="admin-input admin-input-with-prefix"
                        inputMode="decimal"
                        value={draft.desconto}
                        onChange={(e) => setDraft((d) => ({ ...d, desconto: e.target.value }))}
                        placeholder="0,00"
                      />
                    </div>
                  )}
                </div>
                <AmountTypeToggle
                  value={draft.descontoTipo || '$'}
                  onChange={(descontoTipo) => setDraft((d) => ({ ...d, descontoTipo }))}
                />
              </div>
              <p className="admin-help-text">
                Percentual aplicado sobre o subtotal dos itens (sem frete).
              </p>
            </div>
          ) : null}

          {tab === 'acrescimo' ? (
            <div className="admin-order-adj-panel">
              <div className="admin-order-adj-value-row">
                <div className="admin-order-adj-value-field">
                  <label className="admin-label">Valor do acréscimo</label>
                  {draft.acrescimoTipo === '%' ? (
                    <input
                      className="admin-input"
                      inputMode="decimal"
                      value={draft.acrescimo}
                      onChange={(e) => setDraft((d) => ({ ...d, acrescimo: e.target.value }))}
                      placeholder="0"
                    />
                  ) : (
                    <div className="admin-input-prefix-wrap">
                      <span className="admin-input-prefix" aria-hidden="true">
                        $
                      </span>
                      <input
                        className="admin-input admin-input-with-prefix"
                        inputMode="decimal"
                        value={draft.acrescimo}
                        onChange={(e) => setDraft((d) => ({ ...d, acrescimo: e.target.value }))}
                        placeholder="0,00"
                      />
                    </div>
                  )}
                </div>
                <AmountTypeToggle
                  value={draft.acrescimoTipo || '$'}
                  onChange={(acrescimoTipo) => setDraft((d) => ({ ...d, acrescimoTipo }))}
                />
              </div>
              <p className="admin-help-text">
                Percentual aplicado sobre o subtotal dos itens (sem frete).
              </p>
            </div>
          ) : null}

          {tab === 'cupom' ? (
            <div className="admin-order-adj-panel">
              <OrderCouponPicker draft={draft} setDraft={setDraft} cupons={cupons} inline />
            </div>
          ) : null}
        </div>

        <div className="admin-order-aux-modal-footer">
          <button type="button" className="admin-btn admin-btn-primary" onClick={onClose}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
