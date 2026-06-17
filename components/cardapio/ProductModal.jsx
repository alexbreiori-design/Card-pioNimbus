'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCardapioCart, useCardapioCatalog } from '@/context/CardapioContext';
import {
  buildMarmitaCartOpts,
  findFirstIncompleteMarmitaStep,
  isMarmitaStepComplete,
} from '@/lib/marmita/marmitaWizard';
import {
  buildPizzaCartLabels,
  buildPizzaWizardSteps,
  computePizzaWizardUnitPrice,
  findFirstIncompletePizzaStep,
  isPizzaStepComplete,
} from '@/lib/pizza/pizzaWizard';
import MarmitaWizardSteps from './MarmitaWizardSteps';
import PizzaWizardSteps from './PizzaWizardSteps';
import MenuImageArea from '@/components/cardapio/MenuImageArea';
import { IconClose } from './icons';

export default function ProductModal() {
  const { formatPrice, filteredProducts } = useCardapioCatalog();
  const {
    productOpen,
    closeProductPopup,
    currentProduct,
    currentQty,
    selectedAddons,
    addonExtras,
    popupHeaderCompact,
    setPopupHeaderCompact,
    popupDetailsRef,
    toggleAddon,
    changeQty,
    addToCart,
    addToCartCustom,
    adicionarTotal,
  } = useCardapioCart();

  const product = currentProduct;
  const productAddons = product?.addons || [];
  const isPizza = product?.type === 'pizza' && product?.pizzaConfig;
  const pizzaPromoShortcut = product?.pizzaPromoShortcut || null;
  const isMarmita = product?.type === 'marmita';
  const marmitaSteps = productAddons;
  const hasMarmitaWizard = isMarmita && marmitaSteps.length > 0;
  const hasPizzaWizard = Boolean(isPizza);

  const [pizzaStep, setPizzaStep] = useState(0);
  const [pizzaState, setPizzaState] = useState({ sizeId: '', flavorSlots: [] });
  const [marmitaStep, setMarmitaStep] = useState(0);

  const pizzaSteps = useMemo(
    () =>
      hasPizzaWizard
        ? buildPizzaWizardSteps(product, pizzaState, { catalogProducts: filteredProducts })
        : [],
    [hasPizzaWizard, product, pizzaState, filteredProducts]
  );

  const currentPizzaStep = pizzaSteps[pizzaStep];
  const pizzaUnitPrice = hasPizzaWizard
    ? pizzaPromoShortcut
      ? Number(pizzaPromoShortcut.promoPrice || product.price || 0) + addonExtras
      : computePizzaWizardUnitPrice(product, pizzaState, addonExtras)
    : 0;
  const firstPizzaAddonStep = useMemo(
    () => pizzaSteps.findIndex((step) => step.type === 'addons'),
    [pizzaSteps]
  );
  const promoWizardSteps = useMemo(() => {
    if (!pizzaPromoShortcut) return pizzaSteps;
    return pizzaSteps.filter((step) => step.type === 'addons' || step.type === 'suggestions');
  }, [pizzaPromoShortcut, pizzaSteps]);

  const promoWizardStepIndex = useMemo(() => {
    if (!pizzaPromoShortcut || !currentPizzaStep) return pizzaStep;
    const index = promoWizardSteps.findIndex((step) => step.id === currentPizzaStep.id);
    return index >= 0 ? index : 0;
  }, [pizzaPromoShortcut, promoWizardSteps, currentPizzaStep, pizzaStep]);
  const canPizzaAdvance = hasPizzaWizard
    ? isPizzaStepComplete(currentPizzaStep, pizzaState, selectedAddons)
    : false;
  const isLastPizzaStep = hasPizzaWizard && pizzaStep >= pizzaSteps.length - 1;

  const marmitaUnitTotal = product ? (product.price + addonExtras) * currentQty : 0;
  const currentMarmitaSection = hasMarmitaWizard ? marmitaSteps[marmitaStep] : null;
  const currentMarmitaSelected = selectedAddons[marmitaStep] || [];
  const canMarmitaAdvance = currentMarmitaSection
    ? isMarmitaStepComplete(currentMarmitaSection, currentMarmitaSelected)
    : true;
  const isLastMarmitaStep = hasMarmitaWizard && marmitaStep >= marmitaSteps.length - 1;

  useEffect(() => {
    setMarmitaStep(0);
    if (product?.pizzaPromoShortcut) {
      const { saborId, tamanhoId } = product.pizzaPromoShortcut;
      setPizzaState({ sizeId: tamanhoId, flavorSlots: [saborId] });
      setPizzaStep(-1);
      return;
    }
    setPizzaStep(0);
    setPizzaState({ sizeId: '', flavorSlots: [] });
  }, [product?.id, product?.pizzaPromoShortcut]);

  useEffect(() => {
    if (!product?.pizzaPromoShortcut || !pizzaSteps.length) return;
    if (firstPizzaAddonStep >= 0) {
      setPizzaStep(firstPizzaAddonStep);
      return;
    }
    const suggestionsIndex = pizzaSteps.findIndex((step) => step.type === 'suggestions');
    setPizzaStep(suggestionsIndex >= 0 ? suggestionsIndex : Math.max(0, pizzaSteps.length - 1));
  }, [product?.id, product?.pizzaPromoShortcut, pizzaSteps.length, firstPizzaAddonStep]);

  useEffect(() => {
    if (!hasPizzaWizard) return;
    const maxStep = Math.max(0, pizzaSteps.length - 1);
    if (pizzaStep > maxStep) setPizzaStep(maxStep);
  }, [hasPizzaWizard, pizzaSteps.length, pizzaStep]);

  const handleOverlayClick = (e) => {
    if (e.target.id === 'productOverlay') closeProductPopup();
  };

  const handleScroll = (e) => {
    setPopupHeaderCompact(e.currentTarget.scrollTop > 30);
  };

  function handleSelectPizzaSize(sizeId) {
    setPizzaState({ sizeId, flavorSlots: [] });
  }

  function handleSelectPizzaFlavor(slotIndex, flavorId) {
    setPizzaState((prev) => {
      const slots = [...(prev.flavorSlots || [])];
      if (slots[slotIndex] === flavorId) slots[slotIndex] = '';
      else slots[slotIndex] = flavorId;
      return { ...prev, flavorSlots: slots };
    });
  }

  function handlePizzaAdd() {
    const incomplete = findFirstIncompletePizzaStep(pizzaSteps, pizzaState, selectedAddons);
    if (incomplete >= 0) {
      setPizzaStep(incomplete);
      return;
    }
    addToCartCustom({
      product: pizzaPromoShortcut
        ? { ...product, id: pizzaPromoShortcut.carouselId }
        : product,
      qty: currentQty,
      unitPrice: pizzaUnitPrice,
      opts: buildPizzaCartLabels(product, pizzaState, selectedAddons),
    });
  }

  function handlePizzaPrimaryAction() {
    if (!canPizzaAdvance) return;
    if (isLastPizzaStep) {
      handlePizzaAdd();
      return;
    }
    setPizzaStep((value) => Math.min(value + 1, pizzaSteps.length - 1));
  }

  function handleMarmitaAdd() {
    const incompleteStep = findFirstIncompleteMarmitaStep(marmitaSteps, selectedAddons);
    if (incompleteStep >= 0) {
      setMarmitaStep(incompleteStep);
      return;
    }
    addToCartCustom({
      product,
      qty: currentQty,
      unitPrice: product.price + addonExtras,
      opts: buildMarmitaCartOpts(product, selectedAddons),
    });
  }

  function handleMarmitaPrimaryAction() {
    if (!canMarmitaAdvance) return;
    if (isLastMarmitaStep) {
      handleMarmitaAdd();
      return;
    }
    setMarmitaStep((value) => Math.min(value + 1, marmitaSteps.length - 1));
  }

  function handleAddSuggestion(item) {
    addToCartCustom({
      product: item,
      qty: 1,
      unitPrice: item.price,
      opts: [],
    });
  }

  if (!productOpen || !product) return null;

  const showGenericAddons = !isPizza && !isMarmita;
  const showEmptyAddonsMessage = showGenericAddons && productAddons.length === 0;
  const wizardMode = hasPizzaWizard || hasMarmitaWizard;

  return (
    <div
      className={`overlay ${productOpen ? 'open' : ''}`}
      id="productOverlay"
      onClick={handleOverlayClick}
    >
      <div
        className={`product-popup ${
          hasMarmitaWizard ? 'product-popup-marmita-wizard' : ''
        } ${hasPizzaWizard ? 'product-popup-pizza-wizard' : ''}`}
        id="productPopup"
      >
        <div className="popup-img-col">
          <MenuImageArea
            imageUrl={product.imageUrl}
            className="popup-img-frame"
            alt={product.name}
            sizes="320px"
          />
        </div>
        <div
          className="popup-details-col"
          id="popupDetailsCol"
          ref={popupDetailsRef}
          onScroll={handleScroll}
        >
          <button type="button" className="popup-close-details" onClick={closeProductPopup} aria-label="Fechar">
            <IconClose />
          </button>
          <div className={`popup-header ${popupHeaderCompact ? 'compact' : ''}`} id="popupHeader">
            <div className="popup-header-title">{product.name}</div>
            {isMarmita && product.tamanhoSelecionado ? (
              <div className="popup-marmita-size-pill">
                Tamanho: {product.tamanhoSelecionado.nome}
              </div>
            ) : null}
            <div className="popup-header-desc">{product.desc}</div>
            <div
              className={`popup-header-price ${
                product.isPromocao && product.promoOriginalPrice > product.price ? 'has-promo' : ''
              }`}
            >
              {product.isPromocao && product.promoOriginalPrice > product.price ? (
                <>
                  <span className="product-price-original">{formatPrice(product.promoOriginalPrice)}</span>
                  <span className="product-price-promo">
                    {formatPrice(hasPizzaWizard ? pizzaUnitPrice : product.price)}
                  </span>
                </>
              ) : (
                formatPrice(
                  hasPizzaWizard ? pizzaUnitPrice : product.price + (hasMarmitaWizard ? addonExtras : 0)
                )
              )}
            </div>
          </div>
          <div className="popup-body" id="popupBody">
            {pizzaPromoShortcut ? (
              <div className="pizza-promo-preset-summary">
                <p className="pizza-promo-preset-kicker">Promoção selecionada</p>
                <p className="pizza-promo-preset-copy">
                  Tamanho e sabor já estão definidos. Escolha os adicionais e siga para finalizar.
                </p>
              </div>
            ) : null}
            {hasPizzaWizard ? (
              <PizzaWizardSteps
                steps={pizzaPromoShortcut ? promoWizardSteps : pizzaSteps}
                stepIndex={pizzaPromoShortcut ? promoWizardStepIndex : pizzaStep}
                pizzaState={pizzaState}
                selectedAddons={selectedAddons}
                onSelectSize={handleSelectPizzaSize}
                onSelectFlavor={handleSelectPizzaFlavor}
                onToggleAddon={toggleAddon}
                onAddSuggestion={handleAddSuggestion}
                formatPrice={formatPrice}
                pizzaConfig={product.pizzaConfig}
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

            {showEmptyAddonsMessage ? (
              <p className="popup-empty-addons">Sem opções adicionais para este produto.</p>
            ) : null}

            {showGenericAddons
              ? productAddons.map((sec, si) => {
                  const selected = selectedAddons[si] || [];
                  return (
                    <div className="addon-section" key={sec.section}>
                      <div className="addon-section-header">
                        <div className="addon-section-title">{sec.stepTitle || sec.section}</div>
                      </div>
                      <div className="addon-section-meta">
                        <span className="addon-count-badge">
                          {selected.length} / {sec.max}
                        </span>
                        {sec.required ? <span className="obrigatorio-badge">OBRIGATÓRIO</span> : null}
                        <span className="addon-section-hint">
                          Escolha até {sec.max} {sec.max > 1 ? 'opções' : 'opção'}
                        </span>
                      </div>
                      {sec.items.map((item) => {
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
                              onClick={() => toggleAddon(si, item.id, item.extra)}
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
          <div
            className={`popup-footer ${
              hasMarmitaWizard ? 'popup-footer-marmita-wizard' : ''
            } ${hasPizzaWizard ? 'popup-footer-pizza-wizard' : ''}`}
          >
            <div className="qty-controls">
              <button type="button" className="qty-btn minus" onClick={() => changeQty(-1)}>
                −
              </button>
              <span className="qty-num">{currentQty}</span>
              <button type="button" className="qty-btn plus" onClick={() => changeQty(1)}>
                +
              </button>
            </div>

            {hasPizzaWizard ? (
              <div className="pizza-wizard-footer-actions">
                {!pizzaPromoShortcut && pizzaStep > 0 ? (
                  <button
                    type="button"
                    className="pizza-wizard-nav-btn wizard-nav-btn"
                    onClick={() => setPizzaStep((value) => Math.max(0, value - 1))}
                    aria-label="Voltar"
                  >
                    <span className="wizard-nav-btn-label">Anterior</span>
                    <span className="wizard-nav-btn-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path
                          d="M14.5 6.5 9 12l5.5 5.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-adicionar pizza-wizard-primary-btn"
                  disabled={!canPizzaAdvance}
                  onClick={handlePizzaPrimaryAction}
                >
                  <span>{isLastPizzaStep ? 'Adicionar pizza' : 'Próximo'}</span>
                  <span>{formatPrice(pizzaUnitPrice * currentQty)}</span>
                </button>
              </div>
            ) : hasMarmitaWizard ? (
              <div className="marmita-wizard-footer-actions">
                {marmitaStep > 0 ? (
                  <button
                    type="button"
                    className="marmita-wizard-nav-btn wizard-nav-btn"
                    onClick={() => setMarmitaStep((value) => Math.max(0, value - 1))}
                    aria-label="Voltar"
                  >
                    <span className="wizard-nav-btn-label">Anterior</span>
                    <span className="wizard-nav-btn-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" focusable="false">
                        <path
                          d="M14.5 6.5 9 12l5.5 5.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn-adicionar marmita-wizard-primary-btn"
                  disabled={!canMarmitaAdvance}
                  onClick={handleMarmitaPrimaryAction}
                >
                  <span>{isLastMarmitaStep ? 'Adicionar' : 'Próximo'}</span>
                  <span>{formatPrice(marmitaUnitTotal)}</span>
                </button>
              </div>
            ) : (
              <button type="button" className="btn-adicionar" onClick={addToCart}>
                <span>Adicionar</span>
                <span>{formatPrice(adicionarTotal)}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
