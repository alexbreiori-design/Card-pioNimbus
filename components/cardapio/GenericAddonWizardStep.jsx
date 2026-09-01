'use client';

import { useMemo, useState } from 'react';
import {
  getAddonStepBadge,
  getAddonStepHint,
  getSectionMaxRepeticoes,
  sectionItemQty,
  sectionTotalQty,
} from '@/lib/cardapio/addonSelection';
import AddonThumb from '@/components/cardapio/AddonThumb';

const GENERIC_SEARCH_MIN_ITEMS = 8;

export default function GenericAddonWizardStep({
  sec,
  si,
  selected,
  formatPrice,
  onToggle,
  onChangeQty,
  hideMeta = false,
}) {
  const [query, setQuery] = useState('');
  const [limitHint, setLimitHint] = useState(false);
  const items = sec.items || [];
  const showSearch = items.length >= GENERIC_SEARCH_MIN_ITEMS;
  const totalSelected = sectionTotalQty(selected);
  const allowRepeat = sec.permitirRepetir === true;
  const maxRep = getSectionMaxRepeticoes(sec);
  const maxUnits = Math.max(1, Number(sec.max || 1));
  const badge = getAddonStepBadge(sec, selected);
  const stepHint = getAddonStepHint(sec, { allowRepeat, maxRepeticoes: maxRep });
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const desc = String(item.desc || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [items, query]);

  function flashLimitHint() {
    setLimitHint(true);
    window.setTimeout(() => setLimitHint(false), 2200);
  }

  function handleToggle(itemId) {
    const ok = onToggle(si, itemId);
    if (ok === false && !hideMeta) flashLimitHint();
  }

  return (
    <div className="addon-section">
        <div className="addon-section-header">
          <div className="addon-section-title">
            {si + 1}. {sec.stepTitle || sec.section}
          </div>
        </div>
        {!hideMeta ? (
          <div className="addon-section-meta">
            <span className={`marmita-wizard-badge marmita-wizard-badge-${badge.tone}`}>
              {badge.text}
            </span>
            {sec.required ? <span className="obrigatorio-badge">OBRIGATÓRIO</span> : null}
            <span className={`marmita-wizard-hint${limitHint ? ' is-limit-flash' : ''}`}>
              {limitHint ? 'Desmarque uma opção para escolher outra' : stepHint}
            </span>
          </div>
        ) : null}
        {showSearch ? (
          <div className="addon-section-search">
            <input
              type="search"
              className="addon-section-search-input"
              placeholder="Buscar opção..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={`Buscar em ${sec.stepTitle || sec.section}`}
            />
            <span className="addon-section-search-meta">
              {filteredItems.length} de {items.length}
            </span>
          </div>
        ) : null}
        {filteredItems.length ? (
          <div
            className={`addon-items-grid${sec.exibirFotos === false ? ' is-text-only' : ''}${
              totalSelected >= maxUnits ? ' is-at-max' : ''
            }`}
          >
            {filteredItems.map((item) => {
              const qty = sectionItemQty(selected, item.id);
              const isActive = qty > 0;
              const canIncrease = qty < maxRep && totalSelected < maxUnits;
              const showQty = allowRepeat && isActive;
              const className = `addon-item addon-item--grid${isActive ? ' is-selected' : ''}${
                sec.exibirFotos === false ? ' is-text-only' : ''
              }${showQty ? ' has-qty-stepper' : ''}`;

              const media = sec.exibirFotos !== false ? <AddonThumb imageUrl={item.imageUrl} /> : null;
              const info = (
                <div className="addon-info">
                  <div className="addon-name">{item.name}</div>
                  {item.desc ? <div className="addon-desc">{item.desc}</div> : null}
                  {item.extra > 0 ? (
                    <div className="addon-price">+ {formatPrice(item.extra)}</div>
                  ) : null}
                </div>
              );
              const qtyControls = showQty ? (
                <span
                  className="addon-qty-stepper"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="addon-qty-icon-btn"
                    aria-label={`Diminuir ${item.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChangeQty?.(si, item.id, -1);
                    }}
                  >
                    −
                  </button>
                  <span className="addon-qty-value">{qty}</span>
                  <button
                    type="button"
                    className="addon-qty-icon-btn"
                    aria-label={`Aumentar ${item.name}`}
                    disabled={!canIncrease}
                    onClick={(event) => {
                      event.stopPropagation();
                      onChangeQty?.(si, item.id, 1);
                    }}
                  >
                    +
                  </button>
                </span>
              ) : (
                <span className={`addon-add-btn${isActive ? ' active' : ''}`} aria-hidden="true">
                  {isActive ? '✓' : null}
                </span>
              );

              if (showQty) {
                return (
                  <div
                    key={item.id}
                    className={className}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    onClick={() => handleToggle(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleToggle(item.id);
                      }
                    }}
                  >
                    {media}
                    {info}
                    {qtyControls}
                  </div>
                );
              }

              return (
                <button
                  type="button"
                  className={className}
                  key={item.id}
                  onClick={() => handleToggle(item.id)}
                >
                  {media}
                  {info}
                  {qtyControls}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="popup-empty-addons">Nenhuma opção encontrada.</p>
        )}
    </div>
  );
}
