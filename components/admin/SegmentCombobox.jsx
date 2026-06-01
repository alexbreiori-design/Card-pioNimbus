'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { filterSegmentos, getSegmentoLabel } from '@/lib/empresaSegmentos';

export default function SegmentCombobox({ value = '', onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const listId = useId();
  const selectedLabel = getSegmentoLabel(value);

  const filtered = useMemo(() => filterSegmentos(query), [query]);

  useEffect(() => {
    function onDocClick(event) {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function select(item) {
    onChange?.(item.id);
    setQuery('');
    setOpen(false);
  }

  const displayValue = open ? query : selectedLabel;

  return (
    <div className="admin-segment-combobox admin-segment-combobox-with-chevron" ref={wrapRef}>
      <div className="admin-segment-input-wrap">
        <input
          className="admin-input admin-input-with-chevron"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder="Selecionar"
          value={displayValue}
          disabled={disabled}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) onChange?.('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setQuery('');
            }
          }}
        />
        <span className="admin-segment-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14">
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </div>
      {open && filtered.length > 0 ? (
        <ul id={listId} className="admin-segment-combobox-list" role="listbox">
          {filtered.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={value === item.id}
                className={value === item.id ? 'is-selected' : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(item)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && query.trim() && filtered.length === 0 ? (
        <div className="admin-segment-combobox-empty">Nenhum segmento encontrado.</div>
      ) : null}
    </div>
  );
}
