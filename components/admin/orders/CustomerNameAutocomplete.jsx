'use client';

import { useEffect, useRef, useState } from 'react';
import { searchCustomersByName } from '@/lib/supabase/customers';
import AdminIcon from '@/components/admin/AdminIcon';
import { fmtPhone } from './orderDraftUtils';

export default function CustomerNameAutocomplete({
  value,
  onChange,
  onSelectCustomer,
  onClear,
  showClear = false,
  empresaId,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const reqId = useRef(0);
  const q = String(value || '').trim();
  const canSearch = Boolean(empresaId) && q.length >= 2;

  useEffect(() => {
    function onPointerDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!canSearch) return undefined;

    const id = ++reqId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchCustomersByName(q, empresaId, { limit: 8 });
        if (reqId.current !== id) return;
        setResults(rows);
      } catch {
        if (reqId.current !== id) return;
        setResults([]);
      } finally {
        if (reqId.current === id) setLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [canSearch, q, empresaId]);

  function selectCustomer(customer) {
    onSelectCustomer?.(customer);
    setOpen(false);
  }

  function handleClear(e) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setResults([]);
    onClear?.();
  }

  const showDropdown = open && canSearch;

  return (
    <div className="admin-form-group admin-order-name-field" ref={wrapRef}>
      <label className="admin-label">Nome</label>
      <div className="admin-order-name-combobox">
        <div className="admin-input-icon-wrap">
          <input
            className={`admin-input${showClear ? ' admin-input-with-icon' : ''}`}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Nome do cliente"
            autoComplete="off"
          />
          {showClear ? (
            <button
              type="button"
              className="admin-input-icon-btn admin-order-name-clear-btn"
              onClick={handleClear}
              disabled={disabled}
              title="Limpar nome, telefone e endereço"
              aria-label="Limpar nome, telefone e endereço"
            >
              <AdminIcon name="close" />
            </button>
          ) : null}
        </div>
        {showDropdown ? (
          <div className="admin-order-name-dropdown" role="listbox">
            {loading ? (
              <p className="admin-order-name-dropdown-empty">Buscando…</p>
            ) : results.length === 0 ? (
              <p className="admin-order-name-dropdown-empty">Nenhum cliente encontrado.</p>
            ) : (
              results.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="admin-order-name-option"
                  onClick={() => selectCustomer(customer)}
                >
                  <span className="admin-order-name-option-name">{customer.name}</span>
                  <small className="admin-order-name-option-phone">{fmtPhone(customer.phone)}</small>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
