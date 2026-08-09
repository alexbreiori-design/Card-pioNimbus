'use client';

import { getMarmitaStepBadge } from '@/lib/marmita/marmitaWizard';
import AddonThumb from '@/components/cardapio/AddonThumb';
import { IconCheck } from './icons';

export default function MarmitaWizardSteps({
  steps,
  stepIndex,
  selectedAddons,
  toggleAddon,
  formatPrice,
}) {
  const section = steps[stepIndex];
  if (!section) return null;

  const selected = selectedAddons[stepIndex] || [];
  const badge = getMarmitaStepBadge(section, selected);
  const stepTitle = section.stepTitle || section.section;
  const showPhotos = section.exibirFotos !== false;

  return (
    <div className="marmita-wizard">
      <div className="addon-section marmita-wizard-step">
        <div className="addon-section-header">
          <div className="addon-section-title">
            {stepIndex + 1}. {stepTitle}
          </div>
        </div>
        <div className="addon-section-meta">
          <span className={`marmita-wizard-badge marmita-wizard-badge-${badge.tone}`}>
            {badge.text}
          </span>
          {section.required ? <span className="obrigatorio-badge">OBRIGATÓRIO</span> : null}
          <span className="marmita-wizard-hint">
            Escolha até {section.max} {section.max > 1 ? 'opções' : 'opção'}
          </span>
        </div>

        <div className={`addon-items-grid${showPhotos ? '' : ' is-text-only'}`}>
          {section.items.map((item) => {
            const isActive = selected.includes(item.id);
            return (
              <button
                type="button"
                className={`addon-item addon-item--grid${showPhotos ? '' : ' is-text-only'}${
                  isActive ? ' is-selected' : ''
                }`}
                key={item.id}
                onClick={() => toggleAddon(stepIndex, item.id, item.extra)}
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
