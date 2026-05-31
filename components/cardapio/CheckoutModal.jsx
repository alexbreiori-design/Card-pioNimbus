'use client';

import { calculateCupomDiscount } from '@/lib/cupons';
import { useCardapio } from '@/context/CardapioContext';
import { IconBack, IconClose, IconContinue, IconStepCheck } from './icons';

function PaymentIcon({ id }) {
  const svgProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (id === 'pix') {
    return (
      <svg {...svgProps}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    );
  }
  if (id === 'vale') {
    return (
      <svg {...svgProps}>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    );
  }
  return (
    <svg {...svgProps}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

export default function CheckoutModal() {
  const {
    checkoutOpen,
    closeCheckout,
    checkoutStep,
    checkoutData,
    checkoutSuccess,
    checkoutOrderNumber,
    checkoutName,
    setCheckoutName,
    checkoutPhone,
    setCheckoutPhone,
    STEP_LABELS,
    PAYMENT_METHODS,
    PAY_LABELS,
    cart,
    cartSubtotal,
    cartTotal,
    deliveryFee,
    appliedCupom,
    savedAddress,
    formatPrice,
    storeConfig,
    formatStoreAddress,
    selectDelivery,
    selectPayment,
    checkoutNext,
    checkoutBack,
    finalizeOrder,
    checkoutAddressConfirmed,
    openCheckoutAddressFlow,
  } = useCardapio();

  const handleOverlayClick = (e) => {
    if (e.target.id === 'checkoutOverlay') closeCheckout();
  };

  const subtotal = cartSubtotal();
  const taxaEntrega = checkoutData.delivery === 'entregar' ? Number(deliveryFee) || 0 : 0;
  const cupomOff = calculateCupomDiscount(appliedCupom, subtotal);
  const total = Math.max(0, subtotal + taxaEntrega - cupomOff);
  const showPixInfo = checkoutData.payment === 'pix' && Boolean(storeConfig?.chavePix);
  const storeAddress = formatStoreAddress(storeConfig);

  const pixInfoBlock = showPixInfo ? (
    <div className="checkout-pix-info">
      <div className="checkout-pix-title">Dados para pagamento Pix</div>
      <div className="checkout-pix-key">{storeConfig.chavePix}</div>
      {storeConfig.descricaoChavePix ? (
        <div className="checkout-pix-desc">{storeConfig.descricaoChavePix}</div>
      ) : null}
    </div>
  ) : null;

  const renderStepBody = () => {
    if (checkoutSuccess) {
      return (
        <div className="success-state">
          <div className="success-icon">🎉</div>
          <div className="success-title">Pedido enviado!</div>
          <div className="success-sub">
            Seu pedido foi recebido com sucesso.
            <br />
            Nº do pedido: <strong>{checkoutOrderNumber || '—'}</strong>
          </div>
          <button type="button" className="btn-voltar" onClick={finalizeOrder}>
            Acompanhar pedido
          </button>
        </div>
      );
    }

    if (checkoutStep === 1) {
      return (
        <>
          <div className="form-group">
            <label className="form-label">Seu nome</label>
            <input
              className="form-input"
              type="text"
              placeholder="Como você se chama?"
              value={checkoutName}
              onChange={(e) => setCheckoutName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input
              className="form-input"
              type="tel"
              placeholder="(00) 00000-0000"
              value={checkoutPhone}
              onChange={(e) => setCheckoutPhone(e.target.value)}
            />
          </div>
        </>
      );
    }

    if (checkoutStep === 2) {
      const deliveryAddressLabel =
        checkoutAddressConfirmed && savedAddress
          ? `${savedAddress.rua}${savedAddress.num ? `, ${savedAddress.num}` : ''} — ${savedAddress.bairro}`
          : null;
      return (
        <>
          <div
            className={`delivery-option ${checkoutData.delivery === 'entregar' ? 'selected' : ''}`}
            onClick={() => selectDelivery('entregar')}
            role="button"
            tabIndex={0}
          >
            <div className="del-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
              </svg>
            </div>
            <div className="del-info">
              <div className="del-title">Receber no seu endereço</div>
              <div className="del-sub">
                {deliveryAddressLabel || 'Informe o CEP para calcular a entrega'}
              </div>
              {checkoutData.delivery === 'entregar' ? (
                <button
                  type="button"
                  className="btn-modal-back"
                  style={{ marginTop: 8, padding: '6px 10px', fontSize: 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openCheckoutAddressFlow();
                  }}
                >
                  {checkoutAddressConfirmed ? 'Alterar endereço' : 'Informar endereço'}
                </button>
              ) : null}
            </div>
            <div className={`radio-circle ${checkoutData.delivery === 'entregar' ? 'selected' : ''}`} />
          </div>
          <div
            className={`delivery-option ${checkoutData.delivery === 'retirar' ? 'selected' : ''}`}
            onClick={() => selectDelivery('retirar')}
            role="button"
            tabIndex={0}
          >
            <div className="del-icon">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="del-info">
              <div className="del-title">Retirar no estabelecimento</div>
              <div className="del-sub">{storeAddress}</div>
            </div>
            <div className={`radio-circle ${checkoutData.delivery === 'retirar' ? 'selected' : ''}`} />
          </div>
        </>
      );
    }

    if (checkoutStep === 3) {
      let lastGroup = '';
      const options = PAYMENT_METHODS.map((m) => {
        const groupHeader =
          m.group !== lastGroup ? (
            <div key={`group-${m.group}`} className="payment-section-label">
              {m.group}
            </div>
          ) : null;
        lastGroup = m.group;
        return (
          <span key={m.id} style={{ display: 'contents' }}>
            {groupHeader}
            <div
              className={`payment-option ${checkoutData.payment === m.id ? 'selected' : ''}`}
              onClick={() => selectPayment(m.id)}
              role="button"
              tabIndex={0}
            >
              <div className="pay-icon">
                <PaymentIcon id={m.id} />
              </div>
              <div className="pay-label">{m.label}</div>
              {checkoutData.payment === m.id && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </span>
        );
      });
      return (
        <>
          {options}
          {pixInfoBlock}
        </>
      );
    }

    if (checkoutStep === 4) {
      const deliveryLabel =
        checkoutData.delivery === 'retirar'
          ? 'Retirar no estabelecimento'
          : 'Receber no endereço';
      return (
        <>
          <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <strong style={{ fontSize: 14, fontWeight: 600 }}>{checkoutData.name}</strong>
            <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 2, fontWeight: 300 }}>
              {checkoutData.phone}
            </div>
          </div>
          <div className="confirm-section-title">Itens do pedido</div>
          {cart.map((item) => (
            <div className="confirm-item-row" key={item.id}>
              <div className="confirm-qty">{item.qty}x</div>
              <div className="confirm-info">
                <div className="confirm-name">{item.name}</div>
                <div className="confirm-opts">{item.opts.join(', ')}</div>
              </div>
              <div className="confirm-price">{formatPrice(item.price * item.qty)}</div>
            </div>
          ))}
          <div className="confirm-section-title">Entrega</div>
          <div className="confirm-delivery-row">
            <strong>{deliveryLabel}</strong>
            <span>
              {checkoutData.delivery === 'entregar' && checkoutAddressConfirmed && savedAddress
                ? `${savedAddress.rua}${savedAddress.num ? `, ${savedAddress.num}` : ''} — ${savedAddress.bairro}`
                : storeAddress}
            </span>
          </div>
          <div className="confirm-section-title">Pagamento</div>
          <div className="confirm-payment-row">
            <strong>{PAY_LABELS[checkoutData.payment] || '—'}</strong>
          </div>
          {pixInfoBlock}
          <div className="confirm-totals">
            <div className="confirm-total-row">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="confirm-total-row">
              <span>Taxa de entrega</span>
              <span>
                {checkoutData.delivery === 'entregar'
                  ? formatPrice(taxaEntrega)
                  : formatPrice(0)}
              </span>
            </div>
            {cupomOff > 0 ? (
              <div className="confirm-total-row">
                <span>Cupom ({appliedCupom.codigo})</span>
                <span>− {formatPrice(cupomOff)}</span>
              </div>
            ) : null}
            <div className="confirm-total-row final">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  const btnLabel =
    checkoutSuccess
      ? ''
      : checkoutStep === 4
        ? 'Enviar pedido'
        : 'Continuar';

  return (
    <div
      className={`checkout-overlay ${checkoutOpen ? 'open' : ''}`}
      id="checkoutOverlay"
      onClick={handleOverlayClick}
    >
      <div className="checkout-modal" id="checkoutModal">
        <div className="checkout-topbar">
          <button
            type="button"
            className="checkout-back-btn"
            style={{ visibility: checkoutStep > 1 && !checkoutSuccess ? 'visible' : 'hidden' }}
            onClick={checkoutBack}
          >
            <IconBack />
          </button>
          <div className="checkout-title">Checkout</div>
          <button type="button" className="checkout-close-btn" onClick={closeCheckout}>
            <IconClose />
          </button>
        </div>
        <div
          className="steps-indicator"
          id="stepsIndicator"
          style={{ display: checkoutSuccess ? 'none' : 'flex' }}
        >
          {STEP_LABELS.map((label, i) => {
            const step = i + 1;
            const done = step < checkoutStep;
            const active = step === checkoutStep;
            return (
              <span key={label} style={{ display: 'contents' }}>
                {i > 0 && (
                  <div className={`step-line ${i < checkoutStep ? 'done' : ''}`} id={`line${i}`} />
                )}
                <div
                  className={`step-dot ${done ? 'done' : ''} ${active ? 'active' : ''}`}
                  id={`step${step}dot`}
                  style={{ position: 'relative' }}
                >
                  {done ? <IconStepCheck /> : step}
                  <span className="step-label">{label}</span>
                </div>
              </span>
            );
          })}
        </div>
        <div className="checkout-body" id="checkoutBody">
          {renderStepBody()}
        </div>
        {!checkoutSuccess && (
          <div className="checkout-footer">
            <button type="button" className="btn-checkout-continue" onClick={checkoutNext}>
              <span>{btnLabel}</span>
              <IconContinue />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
