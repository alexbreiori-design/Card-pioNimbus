'use client';

import { useEffect, useState } from 'react';
import AdminIcon from '@/components/admin/AdminIcon';

export default function OrderObservationModal({ value, onClose, onConfirm }) {
  const [local, setLocal] = useState(() => value || '');

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
        className="admin-confirm-modal admin-order-aux-modal admin-order-aux-modal-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-obs-modal-title"
      >
        <div className="admin-order-aux-modal-head">
          <h3 id="order-obs-modal-title">Observação do pedido</h3>
          <button type="button" className="admin-order-aux-close" onClick={onClose} aria-label="Fechar">
            <AdminIcon name="close" />
          </button>
        </div>

        <div className="admin-order-aux-modal-body">
          <div className="admin-form-group">
            <label className="admin-label">Observação</label>
            <textarea
              className="admin-input"
              rows={5}
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Alguma observação sobre o pedido..."
              autoFocus
            />
          </div>
        </div>

        <div className="admin-order-aux-modal-footer">
          <button type="button" className="admin-btn admin-btn-outline admin-order-aux-cancel" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => onConfirm(local)}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
