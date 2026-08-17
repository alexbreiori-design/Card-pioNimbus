'use client';

import { useState } from 'react';
import { getMarmitaStepBadge } from '@/lib/marmita/marmitaWizard';
import { sectionHasItem, sectionTotalQty } from '@/lib/cardapio/addonSelection';
import AddonThumb from '@/components/cardapio/AddonThumb';
import { IconCheck } from './icons';

export default function MarmitaWizardSteps({
  steps,
  stepIndex,
  selectedAddons,
  toggleAddon,
  formatPrice,
  hideMeta = false,
}) {
  const [limitHint, setLimitHint] = useState(false);
  const section = steps[stepIndex];
  if (!section) return null;

  const selected = selectedAddons[stepIndex] || {};
  const badge = getMarmitaStepBadge(section, selected);
  const stepTitle = section.stepTitle || section.section;
  const showPhotos = section.exibirFotos !== false;
  const maxUnits = Math.max(1, Number(section.max || 1));
  const totalSelected = sectionTotalQty(selected);
  const atMax = totalSelected >= maxUnits;

  function flashLimitHint() {
    setLimitHint(true);
    window.setTimeout(() => setLimitHint(false), 2200);
  }

  function handleToggle(itemId) {
    const ok = toggleAddon(stepIndex, itemId, undefined);
    if (ok === false && !hideMeta) flashLimitHint();
  }

  return (
    <div className="marmita-wizard">
      <div className="addon-section marmita-wizard-step">
        <div className="addon-section-header">
          <div className="addon-section-title">
            {stepIndex + 1}. {stepTitle}
          </div>
        </div>
        {!hideMeta ? (
          <div className="addon-section-meta">
            <span className={`marmita-wizard-badge marmita-wizard-badge-${badge.tone}`}>
              {badge.text}
            </span>
            {section.required ? <span className="obrigatorio-badge">OBRIGATÓRIO</span> : null}
            <span className={`marmita-wizard-hint${limitHint ? ' is-limit-flash' : ''}`}>
              {limitHint
                ? 'Desmarque uma opção para escolher outra'
                : `Escolha até ${section.max} ${section.max > 1 ? 'opções' : 'opção'}`}
            </span>
          </div>
        ) : null}

        <div className={`addon-items-grid${showPhotos ? '' : ' is-text-only'}${atMax ? ' is-at-max' : ''}`}>
          {section.items.map((item) => {
            const isActive = sectionHasItem(selected, item.id);
            return (
              <button
                type="button"
                className={`addon-item addon-item--grid${showPhotos ? '' : ' is-text-only'}${
                  isActive ? ' is-selected' : ''
                }`}
                key={item.id}
                onClick={() => handleToggle(item.id)}
                aria-pressed={isActive}
              >
                {showPhotos ? <AddonThumb imageUrl={item.imageUrl} /> : null}
                <div className="addon-info">
                  <div className="addon-name">{item.name}</div>
                  {item.desc ? <div className="addon-desc">{item.desc}</div> : null}
                  {item.extra > 0 ? (
                    <div className="addon-price">+ {formatPrice(item.extra)}</div>
                  ) : null}
                </div>
                <span className={`addon-add-btn${isActive ? ' active' : ''}`} aria-hidden="true">
                  {isActive ? <IconCheck /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
