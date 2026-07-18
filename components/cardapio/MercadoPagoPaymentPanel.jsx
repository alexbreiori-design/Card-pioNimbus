'use client';

import Script from 'next/script';
import { useCallback, useEffect, useState } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import PixPaymentModal from '@/components/cardapio/PixPaymentModal';
import { useCardapio } from '@/context/CardapioContext';

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

export default function MercadoPagoPaymentPanel({ amount }) {
  const {
    checkoutData,
    onlinePaymentConfig,
    onlinePayment,
    submitOnlinePayment,
    cancelOnlinePayment,
  } = useCardapio();
  const [sdkReady, setSdkReady] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const isPix = checkoutData.payment === 'pix_online';
  const payerEmail = onlinePaymentConfig?.sandbox
    ? SANDBOX_EMAIL
    : String(checkoutData.email || '').trim() || undefined;
  const needsCardSdk = Boolean(onlinePaymentConfig?.publicKey) && !isPix;
  const showOnlinePanel = Boolean(onlinePaymentConfig?.publicKey);
  const payment = onlinePayment?.payment;
  const showPixModal = Boolean(isPix && payment?.id && (payment.qrCodeBase64 || payment.qrCode));

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

  async function payWithCard(formData, additionalData) {
    await submitOnlinePayment({
      ...formData,
      deviceId: readMercadoPagoDeviceId(),
      payer: {
        ...(formData?.payer || {}),
        email: payerEmail || formData?.payer?.email,
        identification:
          formData?.payer?.identification || formData?.identification || undefined,
      },
      payment_type_id:
        additionalData?.paymentTypeId ||
        formData?.payment_type_id ||
        'credit_card',
    });
  }

  async function payWithPix() {
    await submitOnlinePayment({
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

  if (payment && !isPix) {
    return (
      <section className="checkout-online-payment" aria-live="polite">
        <p className="checkout-online-waiting">
          Aguardando confirmação do Mercado Pago. Não feche esta tela.
        </p>
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
        <h3>{isPix ? 'Pagamento via Pix' : 'Pagamento com cartão'}</h3>
        <p>
          O pedido será enviado à loja somente depois da aprovação do pagamento.
        </p>
        {onlinePayment?.error ? (
          <div className="checkout-online-error" role="alert">
            {onlinePayment.error}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">
            Modo teste: e-mail <strong>{SANDBOX_EMAIL}</strong>. No cartão use
            titular <strong>APRO</strong>, CPF <strong>12345678909</strong>, CVV{' '}
            <strong>123</strong> e validade <strong>11/30</strong> (ex.: Visa{' '}
            <strong>4235 6477 2802 5682</strong>).
          </p>
        ) : null}
        {isPix ? (
          <button
            type="button"
            className="btn-checkout-continue"
            onClick={() => void payWithPix()}
            disabled={onlinePayment?.loading || showPixModal}
          >
            {onlinePayment?.loading ? 'Gerando Pix…' : 'Gerar QR Code Pix'}
          </button>
        ) : sdkReady ? (
          <CardPayment
            initialization={{
              amount: Number(amount),
              payer: payerEmail ? { email: payerEmail } : undefined,
            }}
            onSubmit={async (formData, additionalData) => {
              await payWithCard(formData, additionalData);
            }}
            onError={(error) => console.error('Mercado Pago Card Brick:', error)}
          />
        ) : (
          <p>Carregando pagamento seguro…</p>
        )}
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
