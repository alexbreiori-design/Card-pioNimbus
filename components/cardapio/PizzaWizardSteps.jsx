'use client';

import { getFlavorPriceForSize } from '@/lib/pizza/pizzaWizard';
import { getAddonStepBadge, getAddonStepHint, sectionHasItem } from '@/lib/cardapio/addonSelection';
import AddonThumb from '@/components/cardapio/AddonThumb';
import { IconCheck } from './icons';

function stepShowsPhotos(step) {
  if (!step) return true;
  if (step.type === 'flavor') return step.exibirFotos !== false;
  if (step.type === 'addons') return step.section?.exibirFotos !== false;
  return true;
}

function OptionCheck({ active }) {
  return (
    <span className={`addon-add-btn${active ? ' active' : ''}`} aria-hidden="true">
      {active ? <IconCheck /> : null}
    </span>
  );
}

function getPizzaStepBadge(step, pizzaState, selectedAddons) {
  if (!step) return null;
  if (step.type === 'size') {
    const done = Boolean(pizzaState?.sizeId);
    return done
      ? { text: '✓ 1/1', tone: 'done' }
      : { text: 'Falta 1', tone: 'missing' };
  }
  if (step.type === 'flavor') {
    const done = Boolean(pizzaState?.flavorSlots?.[step.slotIndex]);
    if (step.required) {
      return done
        ? { text: '✓ 1/1', tone: 'done' }
        : { text: 'Falta 1', tone: 'missing' };
    }
    return done
      ? { text: '✓ 1/1', tone: 'done' }
      : { text: '✓ 0/1', tone: 'done' };
  }
  if (step.type === 'addons' && step.section) {
    return getAddonStepBadge(step.section, selectedAddons?.[step.sectionIndex]);
  }
  return null;
}

function getPizzaStepHint(step) {
  if (!step) return '';
  if (step.type === 'size') {
    return 'Escolha 1 tamanho';
  }
  if (step.type === 'flavor') {
    return step.required ? 'Escolha 1 sabor' : 'Opcional — escolha 1 sabor ou avance';
  }
  if (step.type === 'addons' && step.section) {
    return getAddonStepHint(step.section);
  }
  if (step.type === 'suggestions') {
    return step.hint || 'Sugestões para acompanhar.';
  }
  return step.hint || '';
}

export default function PizzaWizardSteps({
  steps,
  stepIndex,
  pizzaState,
  selectedAddons,
  onSelectSize,
  onSelectFlavor,
  onToggleAddon,
  onAddSuggestion,
  formatPrice,
  pizzaConfig,
}) {
  const step = steps[stepIndex];
  if (!step) return null;

  const showPhotos = stepShowsPhotos(step);
  const badge = getPizzaStepBadge(step, pizzaState, selectedAddons);
  const hint = getPizzaStepHint(step);

  return (
    <div className="pizza-wizard">
      <div className="addon-section pizza-wizard-step">
        <div className="addon-section-header">
          <div className="addon-section-title">
            {stepIndex + 1}. {step.title}
          </div>
        </div>
        <div className="addon-section-meta">
          {badge ? (
            <span className={`marmita-wizard-badge marmita-wizard-badge-${badge.tone}`}>
              {badge.text}
            </span>
          ) : null}
          {step.required ? <span className="obrigatorio-badge">OBRIGATÓRIO</span> : null}
          {hint ? <span className="marmita-wizard-hint">{hint}</span> : null}
        </div>

        {step.type === 'size' ? (
          <div className="addon-items-grid is-text-only">
            {step.sizes.map((size) => {
              const active = pizzaState.sizeId === size.tamanhoId;
              return (
                <button
                  key={size.tamanhoId}
                  type="button"
                  className={`addon-item addon-item--grid is-text-only${active ? ' is-selected' : ''}`}
                  onClick={() => onSelectSize(size.tamanhoId)}
                  aria-pressed={active}
                >
                  <div className="addon-info">
                    <div className="addon-name">{size.tamanhoNome || size.tamanhoId}</div>
                    <div className="addon-desc">
                      Até {size.maxSabores} {size.maxSabores > 1 ? 'sabores' : 'sabor'}
                    </div>
                  </div>
                  <OptionCheck active={active} />
                </button>
              );
            })}
          </div>
        ) : null}

        {step.type === 'flavor' ? (
          <div className={`addon-items-grid${showPhotos ? '' : ' is-text-only'}`}>
            {step.items.map((item) => {
              const active = pizzaState.flavorSlots?.[step.slotIndex] === item.id;
              const price = getFlavorPriceForSize(pizzaConfig, item.id, pizzaState.sizeId);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`addon-item addon-item--grid${showPhotos ? '' : ' is-text-only'}${
                    active ? ' is-selected' : ''
                  }`}
                  onClick={() => onSelectFlavor(step.slotIndex, item.id)}
                  aria-pressed={active}
                >
                  {showPhotos ? <AddonThumb imageUrl={item.imageUrl} /> : null}
                  <div className="addon-info">
                    <div className="addon-name">{item.name}</div>
                    {item.desc ? <div className="addon-desc">{item.desc}</div> : null}
                    <div className="addon-price">{formatPrice(price)}</div>
                  </div>
                  <OptionCheck active={active} />
                </button>
              );
            })}
          </div>
        ) : null}

        {step.type === 'addons' ? (
          <div className={`addon-items-grid${showPhotos ? '' : ' is-text-only'}`}>
            {step.section.items.map((item) => {
              const isActive = sectionHasItem(selectedAddons[step.sectionIndex], item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`addon-item addon-item--grid${showPhotos ? '' : ' is-text-only'}${
                    isActive ? ' is-selected' : ''
                  }`}
                  onClick={() => onToggleAddon(step.sectionIndex, item.id, item.extra)}
                  aria-pressed={isActive}
                >
                  {showPhotos ? <AddonThumb imageUrl={item.imageUrl} /> : null}
                  <div className="addon-info">
                    <div className="addon-name">{item.name}</div>
                    {item.desc ? <div className="addon-desc">{item.desc}</div> : null}
                    {item.extra > 0 ? <div className="addon-price">+ {formatPrice(item.extra)}</div> : null}
                  </div>
                  <OptionCheck active={isActive} />
                </button>
              );
            })}
          </div>
        ) : null}

        {step.type === 'suggestions'
          ? step.items.map((item) => (
              <div className="addon-item pizza-suggestion-item" key={item.id}>
                <AddonThumb imageUrl={item.imageUrl} />
                <div className="addon-info">
                  <div className="addon-name">{item.name}</div>
                  {item.desc ? <div className="addon-desc">{item.desc}</div> : null}
                  <div className="addon-price">{formatPrice(item.price)}</div>
                </div>
                <button
                  type="button"
                  className="pizza-suggestion-add-btn"
                  onClick={() => onAddSuggestion(item)}
                >
                  Adicionar
                </button>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}
