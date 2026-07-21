'use client';

import { useEffect, useId, useRef, useState } from 'react';

export default function AddressAutocompleteInput({
  slug,
  value,
  onChange,
  onAddressSelect,
}) {
  const listboxId = useId();
  const rootRef = useRef(null);
  const selectedValueRef = useRef('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function closeFromOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeFromOutside);
    return () => document.removeEventListener('pointerdown', closeFromOutside);
  }, []);

  useEffect(() => {
    const query = String(value || '').trim();
    if (!slug || query.length < 3) return undefined;
    if (selectedValueRef.current === query) {
      selectedValueRef.current = '';
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setMessage('');
      try {
        const params = new URLSearchParams({ slug, q: query });
        const response = await fetch(`/api/admin/address-autocomplete?${params}`, {
          signal: controller.signal,
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || 'Não foi possível buscar endereços.');
        setSuggestions(json.suggestions || []);
        setOpen(true);
        setActiveIndex(-1);
        if (!json.suggestions?.length) setMessage('Nenhuma rua encontrada.');
      } catch (error) {
        if (error.name === 'AbortError') return;
        setSuggestions([]);
        setOpen(true);
        setMessage(error.message || 'Não foi possível buscar endereços.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, value]);

  function selectAddress(item) {
    selectedValueRef.current = item.logradouro;
    setSuggestions([]);
    setOpen(false);
    setMessage('');
    setActiveIndex(-1);
    onAddressSelect(item);
  }

  function handleKeyDown(event) {
    if (!open || !suggestions.length) {
      if (event.key === 'ArrowDown' && suggestions.length) setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectAddress(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="admin-address-autocomplete" ref={rootRef}>
      <div className="admin-address-autocomplete-input-wrap">
        <input
          className="admin-input"
          value={value}
          onChange={(event) => {
            selectedValueRef.current = '';
            setSuggestions([]);
            setOpen(false);
            setMessage('');
            setActiveIndex(-1);
            onChange(event.target.value);
          }}
          onFocus={() => {
            if (suggestions.length || message) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Digite o nome da rua"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
          }
        />
        {loading ? (
          <span
            className="admin-address-autocomplete-loader"
            aria-label="Buscando endereços"
          />
        ) : null}
      </div>

      {open && (suggestions.length || message) ? (
        <div className="admin-address-autocomplete-menu" id={listboxId} role="listbox">
          {suggestions.map((item, index) => (
            <button
              key={item.id}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={activeIndex === index}
              className={`admin-address-autocomplete-option${
                activeIndex === index ? ' is-active' : ''
              }`}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectAddress(item)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path
                  d="M12 21s7-5.4 7-12a7 7 0 1 0-14 0c0 6.6 7 12 7 12Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="9" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              <span>
                <strong>{item.label}</strong>
                {item.details ? <small>{item.details}</small> : null}
              </span>
            </button>
          ))}
          {message ? <p className="admin-address-autocomplete-message">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
