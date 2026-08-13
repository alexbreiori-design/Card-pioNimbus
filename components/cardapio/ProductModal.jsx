'use client';

import { useEffect, useMemo, useState } from 'react';
import { useCardapioCart, useCardapioCatalog } from '@/context/CardapioContext';
import {
  getAddonStepBadge,
  getAddonStepHint,
  getSectionMaxRepeticoes,
  isAddonSectionComplete,
  sectionItemQty,
  sectionTotalQty,
} from '@/lib/cardapio/addonSelection';
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
import AddonThumb from '@/components/cardapio/AddonThumb';
import MenuImageArea from '@/components/cardapio/MenuImageArea';
import { IconClose } from './icons';

const GENERIC_SEARCH_MIN_ITEMS = 8;
const DESC_COLLAPSE_CHARS = 110;

function isGenericStepComplete(section, selection) {
  return isAddonSectionComplete(section, selection);
}

function findFirstIncompleteGenericStep(sections, selectedAddons) {
  for (let index = 0; index < sections.length; index += 1) {
    if (!isGenericStepComplete(sections[index], selectedAddons[index])) return index;
  }
  return -1;
}

function MobileAddonSection({ sec, si, selected, formatPrice, onToggle, onChangeQty }) {
  const [query, setQuery] = useState('');
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

  return (
    <div className="addon-section">
      <div className="addon-section-header">
        <div className="addon-section-title">
          {si + 1}. {sec.stepTitle || sec.section}
        </div>
      </div>
      <div className="addon-section-meta">
        <span className={`marmita-wizard-badge marmita-wizard-badge-${badge.tone}`}>
          {badge.text}
        </span>
        {sec.required ? <span className="obrigatorio-badge">OBRIGATÓRIO</span> : null}
        <span className="marmita-wizard-hint">{stepHint}</span>
      </div>
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
        <div className={`addon-items-grid${sec.exibirFotos === false ? ' is-text-only' : ''}`}>
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
                  onClick={() => onToggle(si, item.id, item.extra)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onToggle(si, item.id, item.extra);
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
                onClick={() => onToggle(si, item.id, item.extra)}
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

export default function ProductModal() {
  const { formatPrice, filteredProducts } = useCardapioCatalog();
  const {
    productOpen,
    closeProductPopup,
    currentProduct,
    currentQty,
    selectedAddons,
    addonExtras,
    productNote,
    setProductNote,
    popupHeaderCompact,
    setPopupHeaderCompact,
    popupDetailsRef,
    toggleAddon,
    changeAddonQty,
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
  const [genericStep, setGenericStep] = useState(0);
  const [onNoteStep, setOnNoteStep] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

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

  const showGenericWizard = !isPizza && !isMarmita && productAddons.length > 0;
  const showEmptyAddonsMessage = !isPizza && !isMarmita && productAddons.length === 0;
  const currentGenericSection = showGenericWizard ? productAddons[genericStep] : null;
  const currentGenericSelected = selectedAddons[genericStep] || [];
  const canGenericAdvance = currentGenericSection
    ? isGenericStepComplete(currentGenericSection, currentGenericSelected)
    : true;
  const isLastGenericStep = showGenericWizard && genericStep >= productAddons.length - 1;

  const showProductNote =
    onNoteStep || (!hasPizzaWizard && !hasMarmitaWizard && !showGenericWizard);

  const productDesc = String(product?.desc || '').trim();
  const canToggleDesc = productDesc.length > DESC_COLLAPSE_CHARS;

  useEffect(() => {
    setMarmitaStep(0);
    setGenericStep(0);
    setOnNoteStep(false);
    setDescExpanded(false);
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
      setOnNoteStep(false);
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
    if (onNoteStep) {
      handlePizzaAdd();
      return;
    }
    if (!canPizzaAdvance) return;
    if (isLastPizzaStep) {
      setOnNoteStep(true);
      return;
    }
    setPizzaStep((value) => Math.min(value + 1, pizzaSteps.length - 1));
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

  function handleMarmitaPrimaryAction() {
    if (onNoteStep) {
      handleMarmitaAdd();
      return;
    }
    if (!canMarmitaAdvance) return;
    if (isLastMarmitaStep) {
      setOnNoteStep(true);
      return;
    }
    setMarmitaStep((value) => Math.min(value + 1, marmitaSteps.length - 1));
  }

  function handleGenericPrimaryAction() {
    if (onNoteStep) {
      const incompleteStep = findFirstIncompleteGenericStep(productAddons, selectedAddons);
      if (incompleteStep >= 0) {
        setGenericStep(incompleteStep);
        setOnNoteStep(false);
        return;
      }
      addToCart();
      return;
    }
    if (!canGenericAdvance) return;
    if (isLastGenericStep) {
      setOnNoteStep(true);
      return;
    }
    setGenericStep((value) => Math.min(value + 1, productAddons.length - 1));
  }

  function handleWizardBack() {
    if (onNoteStep) {
      setOnNoteStep(false);
      return;
    }
    if (hasPizzaWizard) {
      setPizzaStep((value) => Math.max(0, value - 1));
      return;
    }
    if (hasMarmitaWizard) {
      setMarmitaStep((value) => Math.max(0, value - 1));
      return;
    }
    if (showGenericWizard) {
      setGenericStep((value) => Math.max(0, value - 1));
    }
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

  if (!productOpen || !product) return null;

  const genericUnitTotal = (product.price + addonExtras) * currentQty;

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
            {productDesc ? (
              <div className="popup-header-desc-block">
                <div
                  className={`popup-header-desc${descExpanded ? ' is-expanded' : ''}`}
                >
                  {productDesc}
                </div>
                {canToggleDesc ? (
                  <button
                    type="button"
                    className="popup-header-desc-toggle"
                    onClick={() => setDescExpanded((value) => !value)}
                  >
                    {descExpanded ? 'Ver menos' : 'Ver mais'}
                  </button>
                ) : null}
              </div>
            ) : null}
            <div
              className={`popup-header-price ${
                product.isPromocao && product.promoOriginalPrice > product.price ? 'has-promo' : ''
              }${product.priceLabel && !(product.isPromocao && product.promoOriginalPrice > product.price) ? ' is-from-price' : ''}`}
            >
              {product.isPromocao && product.promoOriginalPrice > product.price ? (
                <>
                  <span className="product-price-original">{formatPrice(product.promoOriginalPrice)}</span>
                  <span className="product-price-promo">
                    {formatPrice(hasPizzaWizard ? pizzaUnitPrice : product.price)}
                  </span>
                </>
              ) : (
                <>
                  {product.priceLabel ? (
                    <span className="product-price-from">{product.priceLabel}</span>
                  ) : null}
                  <span className="product-price-value">
                    {formatPrice(
                      hasPizzaWizard ? pizzaUnitPrice : product.price + (hasMarmitaWizard ? addonExtras : 0)
                    )}
                  </span>
                </>
              )}
            </div>
          </div>
          <div
            className="popup-scroll"
            ref={popupDetailsRef}
            onScroll={handleScroll}
          >
          <div className="popup-body" id="popupBody">
            {pizzaPromoShortcut ? (
              <div className="pizza-promo-preset-summary">
                <p className="pizza-promo-preset-kicker">Promoção selecionada</p>
                <p className="pizza-promo-preset-copy">
                  Tamanho e sabor já estão definidos. Escolha os adicionais e siga para finalizar.
                </p>
              </div>
            ) : null}
            {hasPizzaWizard && !onNoteStep ? (
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

            {hasMarmitaWizard && !onNoteStep ? (
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

            {showGenericWizard && !onNoteStep && currentGenericSection ? (
              <MobileAddonSection
                key={`generic-step-${genericStep}`}
                sec={currentGenericSection}
                si={genericStep}
                selected={currentGenericSelected}
                formatPrice={formatPrice}
                onToggle={toggleAddon}
                onChangeQty={changeAddonQty}
              />
            ) : null}

            {showProductNote ? (
              <div className="product-note-field">
                <label className="product-note-label" htmlFor="productNoteMobile">
                  Observação
                </label>
                <textarea
                  id="productNoteMobile"
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
          </div>
          <div
            className={`popup-footer ${
              hasMarmitaWizard || showGenericWizard ? 'popup-footer-marmita-wizard' : ''
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
                {(!pizzaPromoShortcut && pizzaStep > 0) || onNoteStep ? (
                  <button
                    type="button"
                    className="pizza-wizard-nav-btn wizard-nav-btn"
                    onClick={handleWizardBack}
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
                  disabled={!onNoteStep && !canPizzaAdvance}
                  onClick={handlePizzaPrimaryAction}
                >
                  <span>{onNoteStep ? 'Adicionar pizza' : 'Próximo'}</span>
                  <span>{formatPrice(pizzaUnitPrice * currentQty)}</span>
                </button>
              </div>
            ) : hasMarmitaWizard || showGenericWizard ? (
              <div className="marmita-wizard-footer-actions">
                {(hasMarmitaWizard ? marmitaStep > 0 : genericStep > 0) || onNoteStep ? (
                  <button
                    type="button"
                    className="marmita-wizard-nav-btn wizard-nav-btn"
                    onClick={handleWizardBack}
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
                  disabled={
                    !onNoteStep && (hasMarmitaWizard ? !canMarmitaAdvance : !canGenericAdvance)
                  }
                  onClick={hasMarmitaWizard ? handleMarmitaPrimaryAction : handleGenericPrimaryAction}
                >
                  <span>{onNoteStep ? 'Adicionar' : 'Próximo'}</span>
                  <span>
                    {formatPrice(hasMarmitaWizard ? marmitaUnitTotal : genericUnitTotal)}
                  </span>
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
