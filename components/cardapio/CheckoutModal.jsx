'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { buildOrderWhatsAppMessage, buildSendOrderToStoreUrl } from '@/lib/storeWhatsApp';
import { calculateCupomDiscount } from '@/lib/cupons';
import {
  formatDurationMinutes,
  getCheckoutTipoFromDeliveryMode,
  getEtaFromConfirmedAt,
} from '@/lib/deliveryDuration';
import { MOBILE_PHONE_MASK, formatMobilePhoneBr } from '@/lib/phoneBr';
import CartItemOptsList from '@/components/cardapio/CartItemOptsList';
import { useCardapio } from '@/context/CardapioContext';
import { IconBack, IconClose, IconContinue, IconStepCheck } from './icons';

const MercadoPagoPaymentPanel = dynamic(
  () => import('@/components/cardapio/MercadoPagoPaymentPanel'),
  { ssr: false }
);

function PaymentIcon({ id }) {
  const svgProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (id === 'pix' || id === 'pix_online') {
    return (
      <svg {...svgProps}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
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
    checkoutSuccessSnapshot,
    checkoutOrderNumber,
    checkoutName,
    setCheckoutName,
    checkoutPhone,
    setCheckoutPhone,
    checkoutEmail,
    setCheckoutEmail,
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
    setCheckoutTrocoAnswer,
    setCheckoutTrocoValue,
    checkoutNext,
    checkoutBack,
    dismissCheckoutSuccess,
    checkoutAddressConfirmed,
    openCheckoutAddressFlow,
    getDeliveryEstimateMinutes,
  } = useCardapio();

  const [pixCopied, setPixCopied] = useState(false);

  const whatsAppOrderUrl = useMemo(() => {
    if (!checkoutSuccessSnapshot) return null;
    const snap = checkoutSuccessSnapshot;
    const message = buildOrderWhatsAppMessage({
      orderNumber: snap.orderNumber,
      customerName: snap.customerName,
      customerPhone: snap.customerPhone,
      items: snap.items,
      deliveryLabel:
        snap.delivery === 'entregar' ? 'Receber em casa' : 'Retirar no estabelecimento',
      addressText: snap.addressText || null,
      paymentLabel: PAY_LABELS[snap.payment] || snap.payment,
      subtotalFormatted: formatPrice(snap.subtotal),
      deliveryFeeFormatted:
        snap.delivery === 'entregar' && snap.taxaEntrega > 0
          ? formatPrice(snap.taxaEntrega)
          : null,
      cupomOffFormatted: snap.cupomOff > 0 ? formatPrice(snap.cupomOff) : null,
      totalFormatted: formatPrice(snap.total),
      isPix: snap.payment === 'pix',
    });
    return buildSendOrderToStoreUrl(storeConfig, message);
  }, [checkoutSuccessSnapshot, PAY_LABELS, formatPrice, storeConfig]);

  async function copyPixKey() {
    const key = storeConfig?.chavePix;
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 2200);
    } catch {
      /* fallback silencioso */
    }
  }

  const handleOverlayClick = (e) => {
    if (checkoutSuccess) return;
    if (e.target.id === 'checkoutOverlay') closeCheckout();
  };

  const subtotal = cartSubtotal();
  const taxaEntrega = checkoutData.delivery === 'entregar' ? Number(deliveryFee) || 0 : 0;
  const cupomOff = calculateCupomDiscount(appliedCupom, subtotal);
  const total = Math.max(0, subtotal + taxaEntrega - cupomOff);
  const isOnlinePayment = ['pix_online', 'credito_online'].includes(checkoutData.payment);
  const showPixInfo = checkoutData.payment === 'pix' && Boolean(storeConfig?.chavePix);
  const storeAddress = formatStoreAddress(storeConfig);

  const confirmOrderTipo = getCheckoutTipoFromDeliveryMode(checkoutData.delivery);
  const confirmEstimate = useMemo(() => {
    const minutes = getDeliveryEstimateMinutes(confirmOrderTipo);
    const eta = getEtaFromConfirmedAt(new Date(), storeConfig, confirmOrderTipo);
    return {
      minutes,
      durationLabel: formatDurationMinutes(minutes),
      untilLabel: eta.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      isDelivery: confirmOrderTipo === 'delivery',
    };
  }, [checkoutData.delivery, getDeliveryEstimateMinutes, storeConfig, confirmOrderTipo]);

  const checkoutTitle =
    checkoutSuccess ? 'Pedido enviado' : checkoutStep === 4 ? 'Confirmação' : 'Checkout';

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
      const isPix = checkoutSuccessSnapshot?.payment === 'pix';
      const showPixBlock = isPix && Boolean(storeConfig?.chavePix);
      return (
        <div className="success-state">
          <div className="success-icon">🎉</div>
          <div className="success-title">Pedido enviado!</div>
          <div className="success-sub">
            Seu pedido foi registrado com sucesso.
            <br />
            Nº do pedido: <strong>{checkoutSuccessSnapshot?.orderNumber || checkoutOrderNumber || '—'}</strong>
          </div>
          {showPixBlock ? (
            <div className="checkout-success-pix">
              <div className="checkout-pix-title">Pague via Pix</div>
              <div className="checkout-pix-key">{storeConfig.chavePix}</div>
              {storeConfig.descricaoChavePix ? (
                <div className="checkout-pix-desc">{storeConfig.descricaoChavePix}</div>
              ) : null}
              <button type="button" className="btn-copy-pix" onClick={copyPixKey}>
                {pixCopied ? 'Chave copiada!' : 'Copiar chave Pix'}
              </button>
              <p className="checkout-success-pix-hint">
                Depois de pagar, envie o comprovante pelo WhatsApp da loja.
              </p>
            </div>
          ) : null}
          {whatsAppOrderUrl ? (
            <a
              className="btn-checkout-whatsapp"
              href={whatsAppOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {isPix ? 'Enviar pedido e comprovante no WhatsApp' : 'Enviar pedido no WhatsApp'}
            </a>
          ) : null}
          <button type="button" className="btn-voltar btn-voltar-ghost" onClick={dismissCheckoutSuccess}>
            Fechar
          </button>
        </div>
      );
    }

    if (checkoutStep === 1) {
      return (
        <>
          <div className="form-group">
            <label className="form-label">Telefone</label>
            <input
              className="form-input"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder={MOBILE_PHONE_MASK}
              value={checkoutPhone}
              onChange={(e) => setCheckoutPhone(formatMobilePhoneBr(e.target.value))}
            />
          </div>
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
            <label className="form-label">E-mail</label>
            <input
              className="form-input"
              type="email"
              autoComplete="email"
              placeholder="Necessário para pagamento online"
              value={checkoutEmail}
              onChange={(e) => setCheckoutEmail(e.target.value)}
            />
            <small className="checkout-field-hint">
              Usado somente se você escolher pagar agora.
            </small>
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
        const isDinheiro = m.id === 'dinheiro';
        const isSelected = checkoutData.payment === m.id;
        return (
          <span key={m.id} style={{ display: 'contents' }}>
            {groupHeader}
            <div
              className={`payment-option ${isSelected ? 'selected' : ''}`}
              onClick={() => selectPayment(m.id)}
              role="button"
              tabIndex={0}
            >
              <div className="pay-icon">
                <PaymentIcon id={m.id} />
              </div>
              <div className="pay-label">{m.label}</div>
              {isSelected ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
            </div>
            {isDinheiro && isSelected ? (
              <div className="checkout-troco-block">
                <p className="checkout-troco-question">Precisa de troco?</p>
                <div className="checkout-choice-row">
                  <button
                    type="button"
                    className={`checkout-choice-btn ${checkoutData.trocoAnswer === 'sim' ? 'selected' : ''}`}
                    onClick={() => setCheckoutTrocoAnswer('sim')}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    className={`checkout-choice-btn ${checkoutData.trocoAnswer === 'nao' ? 'selected' : ''}`}
                    onClick={() => setCheckoutTrocoAnswer('nao')}
                  >
                    Não
                  </button>
                </div>
                {checkoutData.trocoAnswer === 'sim' ? (
                  <div className="checkout-troco-value-wrap">
                    <label className="form-label checkout-troco-value-label" htmlFor="checkoutTrocoValue">
                      Troco para:
                    </label>
                    <input
                      id="checkoutTrocoValue"
                      className="form-input checkout-troco-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      value={checkoutData.trocoValue}
                      onChange={(e) => setCheckoutTrocoValue(e.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </span>
        );
      });
      return <>{options}</>;
    }

    if (checkoutStep === 4) {
      const deliveryLabel =
        checkoutData.delivery === 'retirar'
          ? 'Retirar no estabelecimento'
          : 'Receber no endereço';
      const deliveryDetail =
        checkoutData.delivery === 'entregar' && checkoutAddressConfirmed && savedAddress
          ? `${savedAddress.rua}${savedAddress.num ? `, ${savedAddress.num}` : ''} — ${savedAddress.bairro}`
          : storeAddress;
      const etaActionLabel = confirmEstimate.isDelivery ? 'Entrega até' : 'Retirada até';

      return (
        <div className="checkout-confirm">
          <section className="confirm-panel confirm-panel--l2" aria-label="Dados do cliente">
            <h3 className="confirm-panel__label">Contato</h3>
            <dl className="confirm-meta-list">
              <div className="confirm-meta-row">
                <dt>Nome</dt>
                <dd>{checkoutData.name}</dd>
              </div>
              <div className="confirm-meta-row">
                <dt>Telefone</dt>
                <dd>{checkoutData.phone}</dd>
              </div>
            </dl>
          </section>

          <section className="confirm-panel confirm-panel--l4" aria-label="Itens do pedido">
            <h3 className="confirm-panel__label">Seu pedido</h3>
            <ul className="confirm-order-list">
              {cart.map((item) => (
                <li className="confirm-order-line" key={item.id}>
                  <div className="confirm-order-line-main">
                    <span className="confirm-order-qty">{item.qty}x</span>
                    <span className="confirm-order-name">{item.name}</span>
                  </div>
                  {item.opts?.length ? (
                    <CartItemOptsList opts={item.opts} className="confirm-order-opts" />
                  ) : null}
                  <span className="confirm-order-price">{formatPrice(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="confirm-panel confirm-panel--l2" aria-label="Entrega e pagamento">
            <h3 className="confirm-panel__label">Entrega e pagamento</h3>
            <dl className="confirm-meta-list">
              <div className="confirm-meta-row">
                <dt>Entrega</dt>
                <dd>
                  <span className="confirm-meta-primary">{deliveryLabel}</span>
                  <span className="confirm-meta-secondary">{deliveryDetail}</span>
                </dd>
              </div>
              <div className="confirm-meta-row">
                <dt>Pagamento</dt>
                <dd>
                  <span className="confirm-meta-primary">{PAY_LABELS[checkoutData.payment] || '—'}</span>
                  {checkoutData.payment === 'dinheiro' &&
                  checkoutData.trocoAnswer === 'sim' &&
                  checkoutData.trocoValue ? (
                    <span className="confirm-meta-secondary">
                      Troco para {checkoutData.trocoValue}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
            {pixInfoBlock}
          </section>

          <section className="confirm-panel confirm-panel--l3" aria-label="Tempo estimado" role="status">
            <h3 className="confirm-panel__label">Tempo estimado</h3>
            <p className="confirm-panel__lead">
              <span className="confirm-eta-duration">{confirmEstimate.durationLabel}</span>
              <span className="confirm-eta-sep">·</span>
              <span>
                {etaActionLabel} <strong>{confirmEstimate.untilLabel}</strong>
              </span>
            </p>
          </section>

          <section className="confirm-panel confirm-panel--l5" aria-label="Valor a pagar">
            <h3 className="confirm-panel__label">Valor a pagar</h3>
            <dl className="confirm-pay-lines">
              {Number(storeConfig?.pedidoMinimo || 0) > 0 ? (
                <div className="confirm-pay-line">
                  <dt>Pedido mínimo</dt>
                  <dd>{formatPrice(Number(storeConfig.pedidoMinimo))}</dd>
                </div>
              ) : null}
              <div className="confirm-pay-line">
                <dt>Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              {checkoutData.delivery === 'entregar' ? (
                <div className="confirm-pay-line">
                  <dt>Taxa de entrega</dt>
                  <dd>{taxaEntrega > 0 ? formatPrice(taxaEntrega) : 'Grátis'}</dd>
                </div>
              ) : null}
              {cupomOff > 0 ? (
                <div className="confirm-pay-line">
                  <dt>Cupom ({appliedCupom.codigo})</dt>
                  <dd>− {formatPrice(cupomOff)}</dd>
                </div>
              ) : null}
            </dl>
            <div className="confirm-pay-total">
              <span className="confirm-pay-total-label">Total</span>
              <span className="confirm-pay-total-value">{formatPrice(total)}</span>
            </div>
          </section>
          {isOnlinePayment ? <MercadoPagoPaymentPanel amount={total} /> : null}
        </div>
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
      <div
        className={`checkout-modal ${checkoutSuccess ? 'checkout-modal--success' : ''} ${checkoutStep === 4 && !checkoutSuccess ? 'checkout-modal--confirm' : ''}`}
        id="checkoutModal"
      >
        <div className="checkout-topbar" style={{ display: checkoutSuccess ? 'none' : 'flex' }}>
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
        <div
          className={`checkout-body ${checkoutStep === 4 && !checkoutSuccess ? 'checkout-body--confirm' : ''}`}
          id="checkoutBody"
        >
          {renderStepBody()}
        </div>
        {!checkoutSuccess && !(checkoutStep === 4 && isOnlinePayment) && (
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
