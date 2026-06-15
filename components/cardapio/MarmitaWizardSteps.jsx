'use client';

import { getMarmitaStepBadge } from '@/lib/marmita/marmitaWizard';
import { IconCheck, IconPlus } from './icons';
import MenuImageArea from '@/components/cardapio/MenuImageArea';

function AddonThumb({ imageUrl }) {
  return (
    <MenuImageArea
      imageUrl={imageUrl}
      className="addon-thumb"
      alt=""
      sizes="40px"
    />
  );
}

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

  return (
    <div className="marmita-wizard">
      <div className="marmita-wizard-progress" aria-label="Progresso da montagem">
        {steps.map((step, index) => (
          <span
            key={step.section || index}
            className={`marmita-wizard-dot ${
              index < stepIndex ? 'is-done' : index === stepIndex ? 'is-current' : ''
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

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

        {section.items.map((item) => {
          const isActive = selected.includes(item.id);
          return (
            <div className="addon-item" key={item.id}>
              <AddonThumb imageUrl={item.imageUrl} />
              <div className="addon-info">
                <div className="addon-name">{item.name}</div>
                {item.desc ? <div className="addon-desc">{item.desc}</div> : null}
                {item.extra > 0 ? (
                  <div className="addon-price">+ {formatPrice(item.extra)}</div>
                ) : null}
              </div>
              <button
                type="button"
                className={`addon-add-btn ${isActive ? 'active' : ''}`}
                onClick={() => toggleAddon(stepIndex, item.id, item.extra)}
                aria-pressed={isActive}
              >
                {isActive ? <IconCheck /> : <IconPlus />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
