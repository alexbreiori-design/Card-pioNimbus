'use client';

import { useMemo, useState } from 'react';
import { useCardapioCart, useCardapioCatalog } from '@/context/CardapioContext';
import { IconCheck, IconClose, IconPlus } from './icons';

function AddonThumb({ imageUrl, name }) {
  const hasImage = Boolean(imageUrl);
  return (
    <div
      className={`addon-thumb ${hasImage ? 'has-image' : 'is-placeholder'}`}
      style={hasImage ? { backgroundImage: `url(${imageUrl})` } : undefined}
      aria-hidden="true"
    />
  );
}

export default function ProductModal() {
  const { formatPrice } = useCardapioCatalog();
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
  const hasImage = Boolean(product?.imageUrl);
  const isPizza = product?.type === 'pizza' && product?.pizzaConfig;
  const [pizzaSizeId, setPizzaSizeId] = useState('');
  const [pizzaFlavors, setPizzaFlavors] = useState([]);
  const pizzaConfig = product?.pizzaConfig || {};
  const sizeOptions = pizzaConfig.tamanhoConfig || [];
  const flavorPool = useMemo(
    () =>
      (product?.addons || [])
        .flatMap((section) => section.items || [])
        .filter((item) => (pizzaConfig.saboresSelecionados || []).includes(item.id))
        .filter((item, index, arr) => arr.findIndex((x) => x.id === item.id) === index),
    [product?.addons, pizzaConfig.saboresSelecionados]
  );
  const activeSizeId = sizeOptions.some((size) => size.tamanhoId === pizzaSizeId)
    ? pizzaSizeId
    : sizeOptions[0]?.tamanhoId || '';
  const selectedSize = sizeOptions.find((size) => size.tamanhoId === activeSizeId) || sizeOptions[0];
  const maxFlavors = Math.max(1, Number(selectedSize?.maxSabores || 1));
  const allowDuplicate = pizzaConfig.permitirSaboresDuplicados === true;

  function pizzaFlavorPrice(flavorId) {
    const key = `${flavorId}:${selectedSize?.tamanhoId || ''}`;
    const raw = pizzaConfig.precoPorTamanhoSabor?.[key];
    const parsed = Number(String(raw || '').replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    const flavor = flavorPool.find((item) => item.id === flavorId);
    return Number(flavor?.extra || 0);
  }

  const pizzaBaseSizePrice = Number(selectedSize?.tamanhoPreco || product?.price || 0);
  const pizzaFlavorTotal =
    pizzaFlavors.length === 0
      ? 0
      : pizzaConfig.regraPreco === 'media'
        ? pizzaFlavors.reduce((sum, flavorId) => sum + pizzaFlavorPrice(flavorId), 0) / pizzaFlavors.length
        : Math.max(...pizzaFlavors.map((flavorId) => pizzaFlavorPrice(flavorId)));
  const pizzaUnitPrice = pizzaBaseSizePrice + pizzaFlavorTotal + addonExtras;
  const canAddPizza = !isPizza || (selectedSize && pizzaFlavors.length >= 1 && pizzaFlavors.length <= maxFlavors);

  const handleOverlayClick = (e) => {
    if (e.target.id === 'productOverlay') closeProductPopup();
  };

  const handleScroll = (e) => {
    setPopupHeaderCompact(e.currentTarget.scrollTop > 30);
  };

  const togglePizzaFlavor = (flavorId) => {
    setPizzaFlavors((prev) => {
      if (prev.includes(flavorId)) return prev.filter((id) => id !== flavorId);
      if (!allowDuplicate && prev.includes(flavorId)) return prev;
      if (prev.length >= maxFlavors) return prev;
      return [...prev, flavorId];
    });
  };

  if (!productOpen || !product) return null;

  return (
    <div
      className={`overlay ${productOpen ? 'open' : ''}`}
      id="productOverlay"
      onClick={handleOverlayClick}
    >
      <div className="product-popup" id="productPopup">
        <div className="popup-img-col">
          <div
            className={`popup-img-frame ${hasImage ? 'has-image' : 'is-placeholder'}`}
            id="popupCoverImg"
            style={hasImage ? { backgroundImage: `url(${product.imageUrl})` } : undefined}
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
            <div className="popup-header-desc">{product.desc}</div>
            <div className={`popup-header-price ${product.isPromocao && product.promoOriginalPrice > product.price ? 'has-promo' : ''}`}>
              {product.isPromocao && product.promoOriginalPrice > product.price ? (
                <>
                  <span className="product-price-original">{formatPrice(product.promoOriginalPrice)}</span>
                  <span className="product-price-promo">{formatPrice(isPizza ? pizzaUnitPrice : product.price)}</span>
                </>
              ) : (
                formatPrice(isPizza ? pizzaUnitPrice : product.price)
              )}
            </div>
          </div>
          <div className="popup-body" id="popupBody">
            {isPizza ? (
              <div className="addon-section">
                <div className="addon-section-header">
                  <div className="addon-section-title">Tamanho</div>
                </div>
                <div className="addon-section-meta">
                  <span style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 300 }}>
                    Escolha o tamanho e até {maxFlavors} sabores.
                  </span>
                </div>
                <div className="addon-item" style={{ display: 'block' }}>
                  <select
                    className="input-field"
                    value={activeSizeId}
                    onChange={(e) => {
                      setPizzaSizeId(e.target.value);
                      setPizzaFlavors([]);
                    }}
                  >
                    {sizeOptions.map((size) => (
                      <option key={size.tamanhoId} value={size.tamanhoId}>
                        {size.tamanhoNome || size.tamanhoId} ({size.maxSabores} sabores)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="addon-section-header">
                  <div className="addon-section-title">Sabores</div>
                </div>
                {flavorPool.map((flavor) => {
                  const active = pizzaFlavors.includes(flavor.id);
                  return (
                    <div className="addon-item" key={flavor.id}>
                      <AddonThumb imageUrl={flavor.imageUrl} name={flavor.name} />
                      <div className="addon-info">
                        <div className="addon-name">{flavor.name}</div>
                        <div className="addon-price">{formatPrice(pizzaFlavorPrice(flavor.id))}</div>
                      </div>
                      <button type="button" className={`addon-add-btn ${active ? 'active' : ''}`} onClick={() => togglePizzaFlavor(flavor.id)}>
                        {active ? <IconCheck /> : <IconPlus />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {product.addons.length === 0 ? (
              <p style={{ padding: '20px 0', fontSize: 13, color: 'var(--text-light)', fontWeight: 300 }}>
                Sem opções adicionais para este produto.
              </p>
            ) : (
              product.addons.map((sec, si) => {
                if (isPizza && String(sec.section || '').toLowerCase().includes('sabor')) return null;
                const selected = selectedAddons[si] || [];
                return (
                  <div className="addon-section" key={sec.section}>
                    <div className="addon-section-header">
                      <div className="addon-section-title">{sec.section}</div>
                    </div>
                    <div className="addon-section-meta">
                      <span className="addon-count-badge">
                        {selected.length} / {sec.max}
                      </span>
                      {sec.required && <span className="obrigatorio-badge">OBRIGATÓRIO</span>}
                      <span style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 300 }}>
                        Escolha até {sec.max} {sec.max > 1 ? 'opções' : 'opção'}
                      </span>
                    </div>
                    {sec.items.map((item) => {
                      const isActive = selected.includes(item.id);
                      return (
                        <div className="addon-item" key={item.id}>
                          <AddonThumb imageUrl={item.imageUrl} name={item.name} />
                          <div className="addon-info">
                            <div className="addon-name">{item.name}</div>
                            {item.desc && <div className="addon-desc">{item.desc}</div>}
                            {item.extra > 0 && (
                              <div className="addon-price">+ {formatPrice(item.extra)}</div>
                            )}
                          </div>
                          <button
                            type="button"
                            className={`addon-add-btn ${isActive ? 'active' : ''}`}
                            onClick={() => toggleAddon(si, item.id, item.extra)}
                          >
                            {isActive ? <IconCheck /> : <IconPlus />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
          <div className="popup-footer">
            <div className="qty-controls">
              <button type="button" className="qty-btn minus" onClick={() => changeQty(-1)}>
                −
              </button>
              <span className="qty-num">{currentQty}</span>
              <button type="button" className="qty-btn plus" onClick={() => changeQty(1)}>
                +
              </button>
            </div>
            <button
              type="button"
              className="btn-adicionar"
              disabled={!canAddPizza}
              onClick={() => {
                if (!isPizza) {
                  addToCart();
                  return;
                }
                const labels = [
                  `Tamanho: ${selectedSize?.tamanhoNome || selectedSize?.tamanhoId || ''}`,
                  ...pizzaFlavors.map((id) => flavorPool.find((f) => f.id === id)?.name).filter(Boolean),
                ];
                addToCartCustom({
                  product,
                  qty: currentQty,
                  unitPrice: pizzaUnitPrice,
                  opts: labels,
                });
              }}
            >
              <span>Adicionar</span>
              <span>{formatPrice(isPizza ? pizzaUnitPrice * currentQty : adicionarTotal)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
