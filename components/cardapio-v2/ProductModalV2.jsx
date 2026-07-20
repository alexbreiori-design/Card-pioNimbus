'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  getFlavorPoolForSize,
  isPizzaStepComplete,
} from '@/lib/pizza/pizzaWizard';
import MarmitaWizardSteps from '@/components/cardapio/MarmitaWizardSteps';
import PizzaWizardSteps from '@/components/cardapio/PizzaWizardSteps';
import MenuImageArea from '@/components/cardapio/MenuImageArea';
import { V2Icon } from './CardapioV2Icons';

const STEP_PREVIEW_MAX = 6;

function isGenericStepComplete(section, selectedIds = []) {
  const minRequired = section?.required
    ? Math.max(1, Number(section.min || 1))
    : Number(section?.min || 0);
  return selectedIds.length >= minRequired;
}

function toPreviewItem(item = {}, fallbackId = '') {
  return {
    id: String(item.id || item.tamanhoId || fallbackId || item.name || item.nome || ''),
    name: String(item.name || item.tamanhoNome || item.nome || '').trim(),
    imageUrl: item.imageUrl || '',
    extra: Number(item.extra || 0) || 0,
  };
}

function buildAddonSectionPreview(section) {
  const items = (section?.items || []).map(toPreviewItem).filter((item) => item.name);
  return {
    title: section?.stepTitle || section?.section || 'Opções',
    items,
    hint: items.length ? '' : 'Nenhuma opção cadastrada nesta etapa.',
  };
}

function getAllPizzaFlavorPreviewItems(product) {
  const sabores = product?.pizzaConfig?.saboresSelecionados || [];
  return (product?.addons || [])
    .flatMap((section) => section.items || [])
    .filter((item) => sabores.includes(item.id))
    .filter((item, index, arr) => arr.findIndex((entry) => entry.id === item.id) === index)
    .map(toPreviewItem)
    .filter((item) => item.name);
}

function buildPizzaStepPreview(step, product, pizzaState) {
  if (!step) {
    return { title: 'Etapa', items: [], hint: 'Sem opções para pré-visualizar.' };
  }
  if (step.type === 'size') {
    const items = (step.sizes || []).map((size) =>
      toPreviewItem({
        id: size.tamanhoId,
        name: size.tamanhoNome || size.nome,
        imageUrl: size.imageUrl,
      })
    );
    return {
      title: step.title || 'Tamanho',
      items,
      hint: items.length ? '' : 'Nenhum tamanho disponível.',
    };
  }
  if (step.type === 'flavor') {
    const items = pizzaState?.sizeId
      ? getFlavorPoolForSize(product, pizzaState.sizeId).map(toPreviewItem)
      : getAllPizzaFlavorPreviewItems(product);
    return {
      title: step.title || 'Sabores',
      items: items.filter((item) => item.name),
      hint: pizzaState?.sizeId
        ? items.length
          ? ''
          : 'Nenhum sabor para este tamanho.'
        : items.length
          ? 'Prévia geral — os sabores finais dependem do tamanho.'
          : 'Escolha o tamanho para ver os sabores.',
    };
  }
  if (step.type === 'addons') {
    return buildAddonSectionPreview(step.section);
  }
  if (step.type === 'suggestions') {
    const items = (step.items || []).map(toPreviewItem).filter((item) => item.name);
    return {
      title: step.title || 'Sugestões',
      items,
      hint: items.length ? '' : 'Nenhuma sugestão nesta etapa.',
    };
  }
  return { title: step.title || 'Etapa', items: [], hint: 'Sem opções para pré-visualizar.' };
}

function StepPreviewPopover({ preview, formatPrice, visible }) {
  if (!visible || !preview) return null;
  const items = preview.items.slice(0, STEP_PREVIEW_MAX);
  const remaining = Math.max(0, preview.items.length - items.length);

  return (
    <div className="cardapio-v2-step-preview" role="tooltip">
      <div className="cardapio-v2-step-preview-title">{preview.title}</div>
      {preview.hint ? <p className="cardapio-v2-step-preview-hint">{preview.hint}</p> : null}
      {items.length ? (
        <div className="cardapio-v2-step-preview-grid">
          {items.map((item) => (
            <div key={item.id} className="cardapio-v2-step-preview-item">
              <MenuImageArea
                imageUrl={item.imageUrl}
                className="cardapio-v2-step-preview-thumb"
                alt=""
                sizes="40px"
              />
              <span className="cardapio-v2-step-preview-copy">
                <span className="cardapio-v2-step-preview-name">{item.name}</span>
                {item.extra > 0 ? (
                  <span className="cardapio-v2-step-preview-extra">+ {formatPrice(item.extra)}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {remaining > 0 ? (
        <p className="cardapio-v2-step-preview-more">+{remaining} opções</p>
      ) : null}
    </div>
  );
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
    productNote,
    setProductNote,
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
  const [onNoteStep, setOnNoteStep] = useState(false);
  const [hoveredStepIndex, setHoveredStepIndex] = useState(null);
  const hoverLeaveTimerRef = useRef(null);

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
  const canGoBack =
    onNoteStep ||
    (showGenericAddons && genericStep > 0) ||
    (hasMarmitaWizard && marmitaStep > 0) ||
    (hasPizzaWizard && !pizzaPromoShortcut && pizzaStep > 0);

  const stepLabels = useMemo(() => {
    let labels = [];
    if (showGenericAddons) {
      labels = productAddons.map((sec) => sec.stepTitle || sec.section);
    } else if (hasMarmitaWizard) {
      labels = marmitaSteps.map((sec) => sec.stepTitle || sec.section);
    } else if (hasPizzaWizard) {
      labels = (pizzaPromoShortcut ? promoWizardSteps : pizzaSteps).map(
        (step) => step.title || step.label || 'Etapa'
      );
    }
    if (labels.length) labels = [...labels, 'Observação'];
    return labels;
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

  const activeStepIndex = onNoteStep
    ? Math.max(0, stepLabels.length - 1)
    : showGenericAddons
      ? genericStep
      : hasMarmitaWizard
        ? marmitaStep
        : hasPizzaWizard
          ? pizzaPromoShortcut
            ? promoWizardStepIndex
            : pizzaStep
          : 0;

  const stepPreviews = useMemo(() => {
    if (!stepLabels.length) return [];
    return stepLabels.map((label, index) => {
      const isNote = index === stepLabels.length - 1 && label === 'Observação';
      if (isNote) {
        return {
          title: 'Observação',
          items: [],
          hint: 'Campo opcional para detalhes do pedido (ex.: sem cebola).',
        };
      }
      if (showGenericAddons) {
        return buildAddonSectionPreview(productAddons[index]);
      }
      if (hasMarmitaWizard) {
        return buildAddonSectionPreview(marmitaSteps[index]);
      }
      if (hasPizzaWizard) {
        const optionSteps = pizzaPromoShortcut ? promoWizardSteps : pizzaSteps;
        return buildPizzaStepPreview(optionSteps[index], product, pizzaState);
      }
      return { title: label, items: [], hint: '' };
    });
  }, [
    stepLabels,
    showGenericAddons,
    productAddons,
    hasMarmitaWizard,
    marmitaSteps,
    hasPizzaWizard,
    pizzaPromoShortcut,
    promoWizardSteps,
    pizzaSteps,
    product,
    pizzaState,
  ]);

  function clearHoverLeaveTimer() {
    if (hoverLeaveTimerRef.current) {
      window.clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
  }

  function handleStepMouseEnter(index) {
    clearHoverLeaveTimer();
    setHoveredStepIndex(index);
  }

  function handleStepMouseLeave() {
    clearHoverLeaveTimer();
    hoverLeaveTimerRef.current = window.setTimeout(() => {
      setHoveredStepIndex(null);
    }, 120);
  }

  useEffect(() => () => clearHoverLeaveTimer(), []);

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
    setOnNoteStep(false);
    setHoveredStepIndex(null);
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
      setOnNoteStep(false);
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
      setOnNoteStep(false);
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
      note: '',
    });
  }

  function handleStepBack() {
    if (onNoteStep) {
      setOnNoteStep(false);
      return;
    }
    if (showGenericAddons && genericStep > 0) {
      setGenericStep((value) => Math.max(0, value - 1));
      return;
    }
    if (hasMarmitaWizard && marmitaStep > 0) {
      setMarmitaStep((value) => Math.max(0, value - 1));
      return;
    }
    if (hasPizzaWizard && pizzaStep > 0) {
      setPizzaStep((value) => Math.max(0, value - 1));
    }
  }

  async function handleGenericContinue() {
    if (onNoteStep) {
      addToCart();
      return;
    }
    if (!canGenericAdvance) {
      void showAlert(`Selecione uma opção em "${currentGenericSection.section}".`);
      return;
    }
    if (isLastGenericStep) {
      setOnNoteStep(true);
      return;
    }
    setGenericStep((value) => Math.min(value + 1, productAddons.length - 1));
  }

  function handlePrimaryAction() {
    if (onNoteStep) {
      if (hasPizzaWizard) {
        handlePizzaAdd();
        return;
      }
      if (hasMarmitaWizard) {
        handleMarmitaAdd();
        return;
      }
      addToCart();
      return;
    }
    if (showGenericAddons) {
      void handleGenericContinue();
      return;
    }
    if (hasPizzaWizard) {
      if (!canPizzaAdvance) return;
      if (isLastPizzaStep) setOnNoteStep(true);
      else setPizzaStep((value) => Math.min(value + 1, pizzaSteps.length - 1));
      return;
    }
    if (hasMarmitaWizard) {
      if (!canMarmitaAdvance) return;
      if (isLastMarmitaStep) setOnNoteStep(true);
      else setMarmitaStep((value) => Math.min(value + 1, marmitaSteps.length - 1));
      return;
    }
    addToCart();
  }

  const primaryDisabled = onNoteStep
    ? false
    : showGenericAddons
      ? !canGenericAdvance
      : hasPizzaWizard
        ? !canPizzaAdvance
        : hasMarmitaWizard
          ? !canMarmitaAdvance
          : false;

  const primaryLabel = onNoteStep
    ? 'Adicionar'
    : showGenericAddons || hasPizzaWizard || hasMarmitaWizard
      ? 'Continuar'
      : 'Adicionar';

  const showProductNote =
    onNoteStep || (!showGenericAddons && !hasPizzaWizard && !hasMarmitaWizard);

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
              <div className="cardapio-v2-product-modal-stepper-wrap">
                <div className="cardapio-v2-product-modal-stepper" aria-label="Etapas de personalização">
                  {stepLabels.map((label, index) => (
                    <div
                      key={`${label}-${index}`}
                      className={`cardapio-v2-product-modal-step${
                        index === activeStepIndex ? ' is-active' : index < activeStepIndex ? ' is-done' : ''
                      }${hoveredStepIndex === index ? ' is-previewing' : ''}`}
                      onMouseEnter={() => handleStepMouseEnter(index)}
                      onMouseLeave={handleStepMouseLeave}
                    >
                      <span className="cardapio-v2-product-modal-step-dot">{index + 1}</span>
                      <span className="cardapio-v2-product-modal-step-label">{label}</span>
                      <StepPreviewPopover
                        preview={stepPreviews[index]}
                        formatPrice={formatPrice}
                        visible={hoveredStepIndex === index}
                      />
                    </div>
                  ))}
                </div>
                <p className="cardapio-v2-product-modal-stepper-hint">
                  Passe o mouse nos passos para pré-visualizar as opções disponíveis
                </p>
              </div>
            ) : null}

            <div className="cardapio-v2-product-modal-body">
              {!onNoteStep && showGenericAddons && currentGenericSection ? (
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

              {!onNoteStep && hasPizzaWizard ? (
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

              {!onNoteStep && hasMarmitaWizard ? (
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

              {!onNoteStep && !showGenericAddons && !hasPizzaWizard && !hasMarmitaWizard ? (
                <p className="cardapio-v2-product-modal-empty">
                  Personalize a quantidade e adicione ao pedido.
                </p>
              ) : null}

              {showProductNote ? (
                <div className="product-note-field">
                  <label className="product-note-label" htmlFor="productNoteDesktop">
                    Observação
                  </label>
                  <textarea
                    id="productNoteDesktop"
                    className="product-note-input"
                    rows={3}
                    maxLength={200}
                    placeholder="Ex.: sem cebola, ponto da carne, etc. (opcional)"
                    value={productNote}
                    onChange={(event) => setProductNote(event.target.value)}
                  />
                </div>
              ) : null}
            </div>

            <div className="cardapio-v2-product-modal-footer">
              <div className="cardapio-v2-product-modal-footer-left">
                {canGoBack ? (
                  <button
                    type="button"
                    className="cardapio-v2-product-modal-clear"
                    onClick={handleStepBack}
                  >
                    <V2Icon name="arrow-left" />
                    Voltar
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
