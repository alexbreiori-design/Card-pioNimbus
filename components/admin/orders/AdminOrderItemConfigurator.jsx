'use client';

import { useEffect, useMemo, useState } from 'react';
import '@/styles/cardapio.css';
import MarmitaWizardSteps from '@/components/cardapio/MarmitaWizardSteps';
import PizzaWizardSteps from '@/components/cardapio/PizzaWizardSteps';
import { IconClose } from '@/components/cardapio/icons';
import {
  buildCartItemFromConfiguration,
  recalcAddonExtras,
  validateProductConfiguration,
} from '@/lib/admin/orderProductUtils';
import {
  buildPizzaWizardSteps,
  computePizzaWizardUnitPrice,
  isPizzaStepComplete,
} from '@/lib/pizza/pizzaWizard';
import {
  findFirstIncompleteMarmitaStep,
  isMarmitaStepComplete,
} from '@/lib/marmita/marmitaWizard';

function formatPrice(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminOrderItemConfigurator({
  open,
  product,
  catalogProducts = [],
  onClose,
  onConfirm,
}) {
  const catalog = product?.catalogProduct;
  const isPizza = catalog?.type === 'pizza' && catalog?.pizzaConfig;
  const isMarmita = catalog?.type === 'marmita';
  const marmitaSteps = catalog?.addons || [];
  const hasMarmitaWizard = isMarmita && marmitaSteps.length > 0;
  const hasPizzaWizard = Boolean(isPizza);
  const hasGenericAddons = !isPizza && !isMarmita && (catalog?.addons || []).length > 0;

  const [qty, setQty] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState({});
  const [addonExtras, setAddonExtras] = useState(0);
  const [pizzaStep, setPizzaStep] = useState(0);
  const [pizzaState, setPizzaState] = useState({ sizeId: '', flavorSlots: [] });
  const [marmitaStep, setMarmitaStep] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setQty(1);
    setSelectedAddons({});
    setAddonExtras(0);
    setPizzaStep(0);
    setPizzaState({ sizeId: '', flavorSlots: [] });
    setMarmitaStep(0);
    setError('');
  }, [open, product?.id]);

  const pizzaSteps = useMemo(
    () =>
      hasPizzaWizard
        ? buildPizzaWizardSteps(catalog, pizzaState, { catalogProducts })
        : [],
    [hasPizzaWizard, catalog, pizzaState, catalogProducts]
  );

  const currentPizzaStep = pizzaSteps[pizzaStep];
  const pizzaUnitPrice = hasPizzaWizard
    ? computePizzaWizardUnitPrice(catalog, pizzaState, addonExtras)
    : 0;
  const canPizzaAdvance = hasPizzaWizard
    ? isPizzaStepComplete(currentPizzaStep, pizzaState, selectedAddons)
    : false;
  const isLastPizzaStep = hasPizzaWizard && pizzaStep >= pizzaSteps.length - 1;

  const currentMarmitaSection = hasMarmitaWizard ? marmitaSteps[marmitaStep] : null;
  const currentMarmitaSelected = selectedAddons[marmitaStep] || [];
  const canMarmitaAdvance = currentMarmitaSection
    ? isMarmitaStepComplete(currentMarmitaSection, currentMarmitaSelected)
    : true;
  const isLastMarmitaStep = hasMarmitaWizard && marmitaStep >= marmitaSteps.length - 1;

  const unitPrice = hasPizzaWizard
    ? pizzaUnitPrice
    : Number(catalog?.price || product?.preco || 0) + addonExtras;

  function toggleAddon(sectionIdx, itemId) {
    if (!catalog) return;
    setSelectedAddons((prev) => {
      const next = { ...prev };
      if (!next[sectionIdx]) next[sectionIdx] = [];
      const arr = [...next[sectionIdx]];
      const section = catalog.addons[sectionIdx];
      const idx = arr.indexOf(itemId);
      if (idx > -1) arr.splice(idx, 1);
      else {
        if (arr.length >= section.max) arr.shift();
        arr.push(itemId);
      }
      next[sectionIdx] = arr;
      setAddonExtras(recalcAddonExtras(catalog, next));
      return next;
    });
  }

  function handleSelectPizzaSize(sizeId) {
    setPizzaState({ sizeId, flavorSlots: [] });
    setPizzaStep(0);
  }

  function handleSelectPizzaFlavor(slotIndex, flavorId) {
    setPizzaState((prev) => {
      const slots = [...(prev.flavorSlots || [])];
      if (slots[slotIndex] === flavorId) slots[slotIndex] = '';
      else slots[slotIndex] = flavorId;
      return { ...prev, flavorSlots: slots };
    });
  }

  function handleConfirm() {
    const validation = validateProductConfiguration(product, {
      pizzaState,
      selectedAddons,
      pizzaStep,
    });
    if (!validation.ok) {
      setError(validation.message || 'Complete as opções obrigatórias.');
      if (validation.step >= 0) {
        if (hasPizzaWizard) setPizzaStep(validation.step);
        if (hasMarmitaWizard) setMarmitaStep(validation.step);
      }
      return;
    }

    onConfirm(
      buildCartItemFromConfiguration({
        product,
        qty,
        pizzaState,
        selectedAddons,
        addonExtras,
      })
    );
    onClose();
  }

  function handlePizzaPrimaryAction() {
    setError('');
    if (!canPizzaAdvance) return;
    if (isLastPizzaStep) {
      handleConfirm();
      return;
    }
    setPizzaStep((value) => Math.min(value + 1, pizzaSteps.length - 1));
  }

  function handleMarmitaPrimaryAction() {
    setError('');
    if (!canMarmitaAdvance) return;
    if (isLastMarmitaStep) {
      handleConfirm();
      return;
    }
    setMarmitaStep((value) => Math.min(value + 1, marmitaSteps.length - 1));
  }

  if (!open || !product || !catalog) return null;

  return (
    <div className="admin-order-config-overlay" onClick={onClose}>
      <div
        className={`admin-order-config-modal product-popup ${
          hasMarmitaWizard ? 'product-popup-marmita-wizard' : ''
        } ${hasPizzaWizard ? 'product-popup-pizza-wizard' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="popup-details-col admin-order-config-details">
          <button type="button" className="popup-close-details" onClick={onClose} aria-label="Fechar">
            <IconClose />
          </button>
          <div className="popup-header">
            <div className="popup-header-title">{product.nome}</div>
            {isMarmita && catalog.tamanhoSelecionado ? (
              <div className="popup-marmita-size-pill">Tamanho: {catalog.tamanhoSelecionado.nome}</div>
            ) : null}
            <div className="popup-header-desc">{product.descricao || ''}</div>
            <div className="popup-header-price">{formatPrice(unitPrice)}</div>
          </div>

          <div className="popup-body admin-order-config-body">
            {hasPizzaWizard ? (
              <PizzaWizardSteps
                steps={pizzaSteps}
                stepIndex={pizzaStep}
                pizzaState={pizzaState}
                selectedAddons={selectedAddons}
                onSelectSize={handleSelectPizzaSize}
                onSelectFlavor={handleSelectPizzaFlavor}
                onToggleAddon={toggleAddon}
                onAddSuggestion={() => {}}
                formatPrice={formatPrice}
                pizzaConfig={catalog.pizzaConfig}
              />
            ) : null}

            {hasMarmitaWizard ? (
              <MarmitaWizardSteps
                steps={marmitaSteps}
                stepIndex={marmitaStep}
                selectedAddons={selectedAddons}
                toggleAddon={toggleAddon}
                formatPrice={formatPrice}
              />
            ) : null}

            {hasGenericAddons
              ? catalog.addons.map((section, sectionIndex) => {
                  const selected = selectedAddons[sectionIndex] || [];
                  return (
                    <div className="addon-section" key={section.section}>
                      <div className="addon-section-header">
                        <div className="addon-section-title">{section.stepTitle || section.section}</div>
                      </div>
                      <div className="addon-section-meta">
                        <span className="addon-count-badge">
                          {selected.length} / {section.max}
                        </span>
                        {section.required ? <span className="obrigatorio-badge">OBRIGATÓRIO</span> : null}
                      </div>
                      {section.items.map((item) => {
                        const isActive = selected.includes(item.id);
                        return (
                          <div className="addon-item" key={item.id}>
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
                              onClick={() => toggleAddon(sectionIndex, item.id)}
                            >
                              {isActive ? '✓' : '+'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
              : null}
          </div>

          {error ? <p className="admin-order-config-error">{error}</p> : null}

          <div className="popup-footer admin-order-config-footer">
            <div className="admin-order-config-qty">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setQty((v) => Math.max(1, v - 1))}>
                -
              </button>
              <span>{qty}</span>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setQty((v) => v + 1)}>
                +
              </button>
            </div>

            {hasPizzaWizard ? (
              <div className="pizza-wizard-footer-actions">
                {pizzaStep > 0 ? (
                  <button
                    type="button"
                    className="pizza-wizard-nav-btn"
                    onClick={() => setPizzaStep((value) => Math.max(0, value - 1))}
                  >
                    Voltar
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-adicionar pizza-wizard-primary-btn"
                  disabled={!canPizzaAdvance}
                  onClick={handlePizzaPrimaryAction}
                >
                  <span>{isLastPizzaStep ? 'Adicionar ao pedido' : 'Próximo'}</span>
                  <span>{formatPrice(unitPrice * qty)}</span>
                </button>
              </div>
            ) : null}

            {hasMarmitaWizard ? (
              <div className="marmita-wizard-footer-actions">
                {marmitaStep > 0 ? (
                  <button
                    type="button"
                    className="marmita-wizard-nav-btn"
                    onClick={() => setMarmitaStep((value) => Math.max(0, value - 1))}
                  >
                    Voltar
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-adicionar marmita-wizard-primary-btn"
                  disabled={!canMarmitaAdvance}
                  onClick={handleMarmitaPrimaryAction}
                >
                  <span>{isLastMarmitaStep ? 'Adicionar ao pedido' : 'Próximo'}</span>
                  <span>{formatPrice(unitPrice * qty)}</span>
                </button>
              </div>
            ) : null}

            {!hasPizzaWizard && !hasMarmitaWizard ? (
              <button type="button" className="admin-btn admin-btn-primary" onClick={handleConfirm}>
                Adicionar ao pedido · {formatPrice(unitPrice * qty)}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
