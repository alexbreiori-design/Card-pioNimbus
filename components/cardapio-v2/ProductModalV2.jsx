'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCardapio, useCardapioCart, useCardapioCatalog } from '@/context/CardapioContext';
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
import MarmitaWizardSteps from '@/components/cardapio/MarmitaWizardSteps';
import PizzaWizardSteps from '@/components/cardapio/PizzaWizardSteps';
import MenuImageArea from '@/components/cardapio/MenuImageArea';
import { V2Icon } from './CardapioV2Icons';

function isGenericStepComplete(section, selectedIds = []) {
  const minRequired = section?.required
    ? Math.max(1, Number(section.min || 1))
    : Number(section?.min || 0);
  return selectedIds.length >= minRequired;
}

function GenericStepOptions({ section, sectionIndex, selectedIds, onToggle, formatPrice }) {
  return (
    <div className="cardapio-v2-product-modal-options">
      {section.items.map((item) => {
        const isActive = selectedIds.includes(item.id);
        return (
          <button
            key={item.id}
            type="button"
            className={`cardapio-v2-product-modal-option${isActive ? ' is-selected' : ''}`}
            onClick={() => onToggle(sectionIndex, item.id, item.extra)}
          >
            <MenuImageArea
              imageUrl={item.imageUrl}
              className="cardapio-v2-product-modal-option-thumb"
              alt=""
              sizes="48px"
            />
            <span className="cardapio-v2-product-modal-option-copy">
              <strong>{item.name}</strong>
              {item.desc ? <span>{item.desc}</span> : null}
              {item.extra > 0 ? <em>+ {formatPrice(item.extra)}</em> : null}
            </span>
            <span className="cardapio-v2-product-modal-option-check" aria-hidden="true">
              {isActive ? <V2Icon name="check" fill /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function ProductModalV2() {
  const { formatPrice, filteredProducts } = useCardapioCatalog();
  const { showAlert } = useCardapio();
  const {
    productOpen,
    closeProductPopup,
    currentProduct,
    currentQty,
    selectedAddons,
    addonExtras,
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
  const showGenericAddons = !isPizza && !isMarmita && productAddons.length > 0;

  const [pizzaStep, setPizzaStep] = useState(0);
  const [pizzaState, setPizzaState] = useState({ sizeId: '', flavorSlots: [] });
  const [marmitaStep, setMarmitaStep] = useState(0);
  const [genericStep, setGenericStep] = useState(0);
  const [activeImageUrl, setActiveImageUrl] = useState('');

  const pizzaSteps = useMemo(
    () =>
      hasPizzaWizard
        ? buildPizzaWizardSteps(product, pizzaState, { catalogProducts: filteredProducts })
        : [],
    [hasPizzaWizard, product, pizzaState, filteredProducts]
  );

  const currentPizzaStep = pizzaSteps[pizzaStep];
  const firstPizzaAddonStep = useMemo(
    () => pizzaSteps.findIndex((step) => step.type === 'addons'),
    [pizzaSteps]
  );

  const pizzaUnitPrice = hasPizzaWizard
    ? pizzaPromoShortcut
      ? Number(pizzaPromoShortcut.promoPrice || product?.price || 0) + addonExtras
      : computePizzaWizardUnitPrice(product, pizzaState, addonExtras)
    : 0;

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

  const currentGenericSection = showGenericAddons ? productAddons[genericStep] : null;
  const currentGenericSelected = selectedAddons[genericStep] || [];
  const canGenericAdvance = currentGenericSection
    ? isGenericStepComplete(currentGenericSection, currentGenericSelected)
    : true;
  const isLastGenericStep = showGenericAddons && genericStep >= productAddons.length - 1;

  const stepLabels = useMemo(() => {
    if (showGenericAddons) {
      return productAddons.map((sec) => sec.stepTitle || sec.section);
    }
    if (hasMarmitaWizard) {
      return marmitaSteps.map((sec) => sec.stepTitle || sec.section);
    }
    if (hasPizzaWizard) {
      return (pizzaPromoShortcut ? promoWizardSteps : pizzaSteps).map(
        (step) => step.title || step.label || 'Etapa'
      );
    }
    return [];
  }, [
    showGenericAddons,
    productAddons,
    hasMarmitaWizard,
    marmitaSteps,
    hasPizzaWizard,
    pizzaSteps,
    promoWizardSteps,
    pizzaPromoShortcut,
  ]);

  const activeStepIndex = showGenericAddons
    ? genericStep
    : hasMarmitaWizard
      ? marmitaStep
      : hasPizzaWizard
        ? pizzaPromoShortcut
          ? promoWizardStepIndex
          : pizzaStep
        : 0;

  const galleryImages = useMemo(() => {
    const images = [];
    const push = (url, id) => {
      const safe = String(url || '').trim();
      if (!safe || images.some((entry) => entry.url === safe)) return;
      images.push({ id, url: safe });
    };

    push(product?.imageUrl, 'main');

    if (showGenericAddons && currentGenericSection) {
      currentGenericSection.items.forEach((item) => push(item.imageUrl, item.id));
    }

    return images.length ? images : [{ id: 'main', url: '' }];
  }, [product?.imageUrl, showGenericAddons, currentGenericSection]);

  useEffect(() => {
    setMarmitaStep(0);
    setGenericStep(0);
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

  useEffect(() => {
    if (!product?.imageUrl) return;
    setActiveImageUrl(product.imageUrl);
  }, [product?.id, product?.imageUrl]);

  useEffect(() => {
    if (!galleryImages.length) return;
    if (!galleryImages.some((entry) => entry.url === activeImageUrl)) {
      setActiveImageUrl(galleryImages[0].url);
    }
  }, [galleryImages, activeImageUrl]);

  if (!productOpen || !product) return null;

  const displayUnitPrice = hasPizzaWizard
    ? pizzaUnitPrice
    : product.price + addonExtras;

  const footerPrice = hasPizzaWizard
    ? pizzaUnitPrice * currentQty
    : hasMarmitaWizard
      ? marmitaUnitTotal
      : adicionarTotal;

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) closeProductPopup();
  }

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
      product: pizzaPromoShortcut ? { ...product, id: pizzaPromoShortcut.carouselId } : product,
      qty: currentQty,
      unitPrice: pizzaUnitPrice,
      opts: buildPizzaCartLabels(product, pizzaState, selectedAddons),
    });
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

  function handleAddSuggestion(item) {
    addToCartCustom({
      product: item,
      qty: 1,
      unitPrice: item.price,
      opts: [],
    });
  }

  function clearCurrentStep() {
    if (showGenericAddons && currentGenericSection) {
      [...currentGenericSelected].forEach((itemId) => {
        const item = currentGenericSection.items.find((entry) => entry.id === itemId);
        toggleAddon(genericStep, itemId, item?.extra || 0);
      });
      return;
    }
    if (hasMarmitaWizard && currentMarmitaSection) {
      [...currentMarmitaSelected].forEach((itemId) => {
        const item = currentMarmitaSection.items.find((entry) => entry.id === itemId);
        toggleAddon(marmitaStep, itemId, item?.extra || 0);
      });
    }
  }

  async function handleGenericContinue() {
    if (!canGenericAdvance) {
      void showAlert(`Selecione uma opção em "${currentGenericSection.section}".`);
      return;
    }
    if (isLastGenericStep) {
      addToCart();
      return;
    }
    setGenericStep((value) => Math.min(value + 1, productAddons.length - 1));
  }

  function handlePrimaryAction() {
    if (showGenericAddons) {
      void handleGenericContinue();
      return;
    }
    if (hasPizzaWizard) {
      if (!canPizzaAdvance) return;
      if (isLastPizzaStep) handlePizzaAdd();
      else setPizzaStep((value) => Math.min(value + 1, pizzaSteps.length - 1));
      return;
    }
    if (hasMarmitaWizard) {
      if (!canMarmitaAdvance) return;
      if (isLastMarmitaStep) handleMarmitaAdd();
      else setMarmitaStep((value) => Math.min(value + 1, marmitaSteps.length - 1));
      return;
    }
    addToCart();
  }

  const primaryDisabled = showGenericAddons
    ? !canGenericAdvance
    : hasPizzaWizard
      ? !canPizzaAdvance
      : hasMarmitaWizard
        ? !canMarmitaAdvance
        : false;

  const primaryLabel = showGenericAddons
    ? isLastGenericStep
      ? 'Adicionar'
      : 'Continuar'
    : hasPizzaWizard
      ? isLastPizzaStep
        ? 'Adicionar'
        : 'Continuar'
      : hasMarmitaWizard
        ? isLastMarmitaStep
          ? 'Adicionar'
          : 'Continuar'
        : 'Adicionar';

  const genericRequirementLabel = currentGenericSection
    ? `${currentGenericSelected.length}/${Math.max(1, Number(currentGenericSection.max || 1))}${
        currentGenericSection.required ? ' obrigatório' : ''
      }`
    : '';

  return (
    <div
      className="cardapio-v2-product-modal-overlay open"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="cardapio-v2-product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cardapio-v2-product-modal-title"
      >
        <div className="cardapio-v2-product-modal-layout">
          <div className="cardapio-v2-product-modal-gallery">
            <MenuImageArea
              imageUrl={activeImageUrl || product.imageUrl}
              className="cardapio-v2-product-modal-hero"
              alt={product.name}
              sizes="420px"
            />
            {galleryImages.length > 1 ? (
              <div className="cardapio-v2-product-modal-thumbs">
                {galleryImages.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={`cardapio-v2-product-modal-thumb${
                      activeImageUrl === entry.url ? ' is-active' : ''
                    }`}
                    onClick={() => setActiveImageUrl(entry.url)}
                    aria-label="Ver imagem do produto"
                  >
                    <MenuImageArea
                      imageUrl={entry.url}
                      className="cardapio-v2-product-modal-thumb-img"
                      alt=""
                      sizes="72px"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="cardapio-v2-product-modal-panel">
            <button
              type="button"
              className="cardapio-v2-product-modal-close"
              onClick={closeProductPopup}
              aria-label="Fechar"
            >
              ×
            </button>

            <div className="cardapio-v2-product-modal-head">
              <h2 id="cardapio-v2-product-modal-title" className="cardapio-v2-product-modal-title">
                {product.name}
              </h2>
              {product.desc ? (
                <p className="cardapio-v2-product-modal-desc">{product.desc}</p>
              ) : null}
              <div
                className={`cardapio-v2-product-modal-price${
                  product.isPromocao && product.promoOriginalPrice > product.price ? ' has-promo' : ''
                }`}
              >
                {product.isPromocao && product.promoOriginalPrice > product.price ? (
                  <>
                    <span className="product-price-original">{formatPrice(product.promoOriginalPrice)}</span>
                    <span className="product-price-promo">{formatPrice(displayUnitPrice)}</span>
                  </>
                ) : (
                  formatPrice(displayUnitPrice)
                )}
              </div>
            </div>

            {stepLabels.length > 1 ? (
              <div className="cardapio-v2-product-modal-stepper" aria-label="Etapas de personalização">
                {stepLabels.map((label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className={`cardapio-v2-product-modal-step${
                      index === activeStepIndex ? ' is-active' : index < activeStepIndex ? ' is-done' : ''
                    }`}
                  >
                    <span className="cardapio-v2-product-modal-step-dot">{index + 1}</span>
                    <span className="cardapio-v2-product-modal-step-label">{label}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="cardapio-v2-product-modal-body">
              {showGenericAddons && currentGenericSection ? (
                <>
                  <div className="cardapio-v2-product-modal-section-head">
                    <h3>{currentGenericSection.stepTitle || currentGenericSection.section}</h3>
                    <span>{genericRequirementLabel}</span>
                  </div>
                  <GenericStepOptions
                    section={currentGenericSection}
                    sectionIndex={genericStep}
                    selectedIds={currentGenericSelected}
                    onToggle={toggleAddon}
                    formatPrice={formatPrice}
                  />
                </>
              ) : null}

              {hasPizzaWizard ? (
                <div className="cardapio-v2-product-modal-wizard-embed">
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
                </div>
              ) : null}

              {hasMarmitaWizard ? (
                <div className="cardapio-v2-product-modal-wizard-embed">
                  <MarmitaWizardSteps
                    steps={marmitaSteps}
                    stepIndex={marmitaStep}
                    selectedAddons={selectedAddons}
                    toggleAddon={toggleAddon}
                    formatPrice={formatPrice}
                  />
                </div>
              ) : null}

              {!showGenericAddons && !hasPizzaWizard && !hasMarmitaWizard ? (
                <p className="cardapio-v2-product-modal-empty">
                  Personalize a quantidade e adicione ao pedido.
                </p>
              ) : null}
            </div>

            <div className="cardapio-v2-product-modal-footer">
              <div className="cardapio-v2-product-modal-footer-left">
                {(showGenericAddons || hasMarmitaWizard || hasPizzaWizard) && stepLabels.length ? (
                  <button
                    type="button"
                    className="cardapio-v2-product-modal-clear"
                    onClick={clearCurrentStep}
                  >
                    <V2Icon name="trash" />
                    Limpar escolhas
                  </button>
                ) : null}
                <div className="cardapio-v2-product-modal-qty">
                  <button type="button" onClick={() => changeQty(-1)} aria-label="Diminuir quantidade">
                    −
                  </button>
                  <span>{currentQty}</span>
                  <button type="button" onClick={() => changeQty(1)} aria-label="Aumentar quantidade">
                    +
                  </button>
                </div>
              </div>

              <div className="cardapio-v2-product-modal-footer-actions">
                <button type="button" className="cardapio-v2-product-modal-btn cardapio-v2-product-modal-btn--ghost" onClick={closeProductPopup}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="cardapio-v2-product-modal-btn cardapio-v2-product-modal-btn--primary"
                  disabled={primaryDisabled}
                  onClick={handlePrimaryAction}
                >
                  <span>{primaryLabel}</span>
                  {primaryLabel === 'Adicionar' ? (
                    <span className="cardapio-v2-product-modal-btn-price">{formatPrice(footerPrice)}</span>
                  ) : (
                    <V2Icon name="arrow-right" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
