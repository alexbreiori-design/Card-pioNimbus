'use client';

import { useEffect, useId, useRef, useState } from 'react';

function formatCep(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export default function PublicAddressStreetInput({
  slug,
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Rua *',
  inputClassName = 'form-input address-grid-full',
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
        const response = await fetch(`/api/public/address-autocomplete?${params}`, {
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
    onAddressSelect({
      ...item,
      cep: formatCep(item.cep),
    });
  }

  function handleKeyDown(event) {
    if (!open || !suggestions.length) {
      if (event.key === 'ArrowDown' && suggestions.length) setOpen(true);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectAddress(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className="cardapio-address-autocomplete" ref={rootRef}>
      <div className="cardapio-address-autocomplete-input-wrap">
        <input
          className={inputClassName}
          type="text"
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {loading ? <span className="cardapio-address-autocomplete-loader" aria-hidden="true" /> : null}
      </div>
      {open && (suggestions.length > 0 || message) ? (
        <div className="cardapio-address-autocomplete-menu" id={listboxId} role="listbox">
          {suggestions.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={`cardapio-address-autocomplete-option${
                index === activeIndex ? ' is-active' : ''
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectAddress(item)}
            >
              <strong>{item.label}</strong>
              {item.details ? <small>{item.details}</small> : null}
            </button>
          ))}
          {message ? <p className="cardapio-address-autocomplete-message">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
