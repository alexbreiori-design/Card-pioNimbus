'use client';

import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import OnlinePaymentTrustBlock from '@/components/cardapio/OnlinePaymentTrustBlock';
import PixPaymentModal from '@/components/cardapio/PixPaymentModal';
import { useCardapio } from '@/context/CardapioContext';
import { cardBrandLabel, detectCardBrand, maskCardNumberDisplay } from '@/lib/payments/cardBrand';

const SANDBOX_EMAIL = 'test@testuser.com';
const MP_JS_V2 = 'https://sdk.mercadopago.com/js/v2';
const MP_SECURITY_JS = 'https://www.mercadopago.com/v2/security.js';

function readMercadoPagoDeviceId() {
  if (typeof window === 'undefined') return '';
  const fromGlobal = window.MP_DEVICE_SESSION_ID;
  if (fromGlobal) return String(fromGlobal);
  const el = document.getElementById('deviceId');
  if (el?.value) return String(el.value);
  return '';
}

function extractCardPreview(formData = {}, additionalData = {}) {
  const number = String(
    formData?.card_number ||
      formData?.cardNumber ||
      additionalData?.cardNumber ||
      additionalData?.card_number ||
      ''
  );
  const lastFour = String(
    additionalData?.lastFourDigits ||
      additionalData?.last_four_digits ||
      formData?.last_four_digits ||
      formData?.lastFourDigits ||
      number.replace(/\D/g, '').slice(-4) ||
      ''
  ).replace(/\D/g, '').slice(-4);
  const brandRaw = String(
    formData?.payment_method_id ||
      formData?.paymentMethodId ||
      additionalData?.paymentMethodId ||
      additionalData?.payment_method_id ||
      formData?.issuer?.name ||
      additionalData?.issuer?.name ||
      ''
  ).toLowerCase();
  let brand = 'card';
  if (brandRaw.includes('visa')) brand = 'visa';
  else if (brandRaw.includes('master')) brand = 'mastercard';
  else if (brandRaw.includes('amex') || brandRaw.includes('american')) brand = 'amex';
  else if (brandRaw.includes('elo')) brand = 'elo';
  else if (number || additionalData?.bin) {
    brand = detectCardBrand(number || additionalData.bin);
  }
  return {
    brand,
    last4: lastFour,
    masked: maskCardNumberDisplay(lastFour),
    brandLabel: cardBrandLabel(brand),
  };
}

export default function MercadoPagoPaymentPanel({ amount, mode = 'pix' }) {
  const {
    checkoutEmail,
    setCheckoutEmail,
    setCheckoutData,
    onlinePaymentConfig,
    onlinePayment,
    submitOnlinePayment,
    cancelOnlinePayment,
    confirmCheckoutCardDraft,
  } = useCardapio();
  const [sdkReady, setSdkReady] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [localError, setLocalError] = useState('');
  const payerEmail = onlinePaymentConfig?.sandbox
    ? SANDBOX_EMAIL
    : String(checkoutEmail || '').trim() || undefined;
  const needsCardSdk = Boolean(onlinePaymentConfig?.publicKey) && mode === 'collect';
  const showOnlinePanel = Boolean(onlinePaymentConfig?.publicKey);
  const payment = onlinePayment?.payment;
  const showPixModal = Boolean(
    mode === 'pix' && payment?.id && (payment.qrCodeBase64 || payment.qrCode)
  );

  useEffect(() => {
    if (!needsCardSdk) return;
    initMercadoPago(onlinePaymentConfig.publicKey, { locale: 'pt-BR' });
    queueMicrotask(() => setSdkReady(true));
  }, [needsCardSdk, onlinePaymentConfig?.publicKey]);

  useEffect(() => {
    if (!showOnlinePanel || typeof document === 'undefined') return undefined;
    if (document.querySelector('script[data-mp-security="1"]')) return undefined;
    const script = document.createElement('script');
    script.src = MP_SECURITY_JS;
    script.async = true;
    script.setAttribute('view', 'checkout');
    script.setAttribute('output', 'deviceId');
    script.dataset.mpSecurity = '1';
    document.body.appendChild(script);
    return undefined;
  }, [showOnlinePanel]);

  function syncEmail(nextEmail) {
    const email = String(nextEmail || '').trim();
    setCheckoutEmail(email);
    setCheckoutData((d) => ({ ...d, email, cpfCnpj: d.cpfCnpj || '' }));
    return email;
  }

  async function collectCard(formData, additionalData) {
    setLocalError('');
    const email = onlinePaymentConfig?.sandbox
      ? SANDBOX_EMAIL
      : syncEmail(payerEmail || formData?.payer?.email);
    if (!email) {
      setLocalError('Informe um e-mail válido para pagar.');
      return;
    }
    const preview = extractCardPreview(formData, additionalData);
    confirmCheckoutCardDraft({
      brand: preview.brand,
      last4: preview.last4,
      masked: preview.masked || (preview.last4 ? maskCardNumberDisplay(preview.last4) : ''),
      payload: {
        ...formData,
        email,
        deviceId: readMercadoPagoDeviceId(),
        payer: {
          ...(formData?.payer || {}),
          email,
          identification:
            formData?.payer?.identification || formData?.identification || undefined,
        },
        payment_type_id:
          additionalData?.paymentTypeId ||
          formData?.payment_type_id ||
          'credit_card',
      },
    });
  }

  async function payWithPix() {
    setLocalError('');
    const email = onlinePaymentConfig?.sandbox
      ? SANDBOX_EMAIL
      : syncEmail(checkoutEmail);
    if (!onlinePaymentConfig?.sandbox && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) {
      setLocalError('Informe um e-mail válido para pagar.');
      return;
    }
    await submitOnlinePayment({
      email: email || SANDBOX_EMAIL,
      deviceId: readMercadoPagoDeviceId(),
    });
  }

  const handleCancelPix = useCallback(async () => {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelOnlinePayment();
    } finally {
      setCancelling(false);
    }
  }, [cancelOnlinePayment, cancelling]);

  if (mode === 'status' || (payment && mode !== 'pix')) {
    return (
      <section className="checkout-online-payment checkout-online-payment--status" aria-live="polite">
        {onlinePayment?.error ? (
          <div className="checkout-online-error" role="alert">
            {onlinePayment.error}
          </div>
        ) : null}
        {payment && mode !== 'pix' ? (
          <p className="checkout-online-waiting">
            Aguardando confirmação do Mercado Pago. Não feche esta tela.
          </p>
        ) : null}
      </section>
    );
  }

  if (mode === 'collect') {
    return (
      <section className="checkout-online-payment">
        {showOnlinePanel ? (
          <>
            <Script src={MP_JS_V2} strategy="afterInteractive" />
            <input type="hidden" id="deviceId" name="deviceId" defaultValue="" />
          </>
        ) : null}
        <OnlinePaymentTrustBlock provider="mercado_pago" />
        {localError ? (
          <div className="checkout-online-error" role="alert">
            {localError}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">
            Modo teste: e-mail <strong>{SANDBOX_EMAIL}</strong>. No cartão use
            titular <strong>APRO</strong>, CPF <strong>12345678909</strong>, CVV{' '}
            <strong>123</strong> e validade <strong>11/30</strong> (ex.: Visa{' '}
            <strong>4235 6477 2802 5682</strong>).
          </p>
        ) : (
          <div className="checkout-card-field">
            <label className="form-label" htmlFor="mp-card-email">
              E-mail
            </label>
            <input
              id="mp-card-email"
              className="form-input"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={checkoutEmail}
              onChange={(e) => setCheckoutEmail(e.target.value)}
            />
          </div>
        )}
        {sdkReady ? (
          <CardPayment
            initialization={{
              amount: Number(amount),
              payer: payerEmail ? { email: payerEmail } : undefined,
            }}
            customization={{
              visual: {
                texts: {
                  formSubmit: 'Continuar',
                },
              },
            }}
            onSubmit={async (formData, additionalData) => {
              await collectCard(formData, additionalData);
            }}
            onError={(error) => console.error('Mercado Pago Card Brick:', error)}
          />
        ) : (
          <p>Carregando pagamento seguro…</p>
        )}
      </section>
    );
  }

  return (
    <>
      <section className="checkout-online-payment">
        {showOnlinePanel ? (
          <>
            <Script src={MP_JS_V2} strategy="afterInteractive" />
            <input type="hidden" id="deviceId" name="deviceId" defaultValue="" />
          </>
        ) : null}
        <OnlinePaymentTrustBlock provider="mercado_pago" />
        {localError || onlinePayment?.error ? (
          <div className="checkout-online-error" role="alert">
            {localError || onlinePayment.error}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">
            Modo teste: e-mail <strong>{SANDBOX_EMAIL}</strong>.
          </p>
        ) : (
          <div className="checkout-card-field">
            <label className="form-label" htmlFor="mp-pix-email">
              E-mail
            </label>
            <input
              id="mp-pix-email"
              className="form-input"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={checkoutEmail}
              onChange={(e) => setCheckoutEmail(e.target.value)}
            />
          </div>
        )}
        <button
          type="button"
          className="btn-checkout-continue"
          onClick={() => void payWithPix()}
          disabled={onlinePayment?.loading || showPixModal}
        >
          {onlinePayment?.loading ? 'Preparando Pix…' : 'Ir para o pagamento'}
        </button>
      </section>

      <PixPaymentModal
        open={showPixModal}
        payment={payment}
        sandbox={Boolean(onlinePaymentConfig?.sandbox)}
        cancelling={cancelling}
        onCancel={handleCancelPix}
        onExpire={handleCancelPix}
      />
    </>
  );
}
