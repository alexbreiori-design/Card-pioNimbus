'use client';

import { getFlavorPriceForSize } from '@/lib/pizza/pizzaWizard';
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

  return (
    <div className="pizza-wizard">
      <div className="pizza-wizard-progress" aria-label="Progresso da montagem">
        {steps.map((item, index) => (
          <span
            key={item.id}
            className={`pizza-wizard-dot ${
              index < stepIndex ? 'is-done' : index === stepIndex ? 'is-current' : ''
            }`}
            aria-hidden="true"
          />
        ))}
      </div>

      <div className="addon-section pizza-wizard-step">
        <div className="addon-section-header">
          <div className="addon-section-title">
            {stepIndex + 1}. {step.title}
          </div>
        </div>
        {step.hint ? (
          <div className="addon-section-meta">
            <span className="pizza-wizard-hint">{step.hint}</span>
            {step.required ? <span className="obrigatorio-badge">OBRIGATÓRIO</span> : null}
          </div>
        ) : null}

        {step.type === 'size'
          ? step.sizes.map((size) => {
              const active = pizzaState.sizeId === size.tamanhoId;
              return (
                <button
                  key={size.tamanhoId}
                  type="button"
                  className={`pizza-size-card ${active ? 'is-active' : ''}`}
                  onClick={() => onSelectSize(size.tamanhoId)}
                >
                  <span className="pizza-size-card-name">{size.tamanhoNome || size.tamanhoId}</span>
                  <span className="pizza-size-card-meta">
                    Até {size.maxSabores} {size.maxSabores > 1 ? 'sabores' : 'sabor'}
                  </span>
                </button>
              );
            })
          : null}

        {step.type === 'flavor'
          ? step.items.map((item) => {
              const active = pizzaState.flavorSlots?.[step.slotIndex] === item.id;
              const price = getFlavorPriceForSize(pizzaConfig, item.id, pizzaState.sizeId);
              return (
                <div className="addon-item" key={item.id}>
                  <AddonThumb imageUrl={item.imageUrl} />
                  <div className="addon-info">
                    <div className="addon-name">{item.name}</div>
                    {item.desc ? <div className="addon-desc">{item.desc}</div> : null}
                    <div className="addon-price">{formatPrice(price)}</div>
                  </div>
                  <button
                    type="button"
                    className={`addon-add-btn ${active ? 'active' : ''}`}
                    onClick={() => onSelectFlavor(step.slotIndex, item.id)}
                    aria-pressed={active}
                  >
                    {active ? <IconCheck /> : <IconPlus />}
                  </button>
                </div>
              );
            })
          : null}

        {step.type === 'addons'
          ? step.section.items.map((item) => {
              const selected = selectedAddons[step.sectionIndex] || [];
              const isActive = selected.includes(item.id);
              return (
                <div className="addon-item" key={item.id}>
                  <AddonThumb imageUrl={item.imageUrl} />
                  <div className="addon-info">
                    <div className="addon-name">{item.name}</div>
                    {item.desc ? <div className="addon-desc">{item.desc}</div> : null}
                    {item.extra > 0 ? <div className="addon-price">+ {formatPrice(item.extra)}</div> : null}
                  </div>
                  <button
                    type="button"
                    className={`addon-add-btn ${isActive ? 'active' : ''}`}
                    onClick={() => onToggleAddon(step.sectionIndex, item.id, item.extra)}
                    aria-pressed={isActive}
                  >
                    {isActive ? <IconCheck /> : <IconPlus />}
                  </button>
                </div>
              );
            })
          : null}

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
