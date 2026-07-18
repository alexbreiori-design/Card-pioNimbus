'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { useCardapio } from '@/context/CardapioContext';

const SANDBOX_EMAIL = 'test@testuser.com';

export default function MercadoPagoPaymentPanel({ amount }) {
  const {
    checkoutData,
    onlinePaymentConfig,
    onlinePayment,
    submitOnlinePayment,
  } = useCardapio();
  const [sdkReady, setSdkReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const isPix = checkoutData.payment === 'pix_online';
  const payerEmail = onlinePaymentConfig?.sandbox
    ? SANDBOX_EMAIL
    : String(checkoutData.email || '').trim() || undefined;

  useEffect(() => {
    if (!onlinePaymentConfig?.publicKey || isPix) return;
    initMercadoPago(onlinePaymentConfig.publicKey, { locale: 'pt-BR' });
    queueMicrotask(() => setSdkReady(true));
  }, [isPix, onlinePaymentConfig?.publicKey]);

  async function copyPix() {
    const code = onlinePayment?.payment?.qrCode;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function copyOrderId(orderId) {
    if (!orderId) return;
    await navigator.clipboard.writeText(orderId);
    setCopiedOrderId(true);
    window.setTimeout(() => setCopiedOrderId(false), 2000);
  }

  const payment = onlinePayment?.payment;
  if (payment) {
    return (
      <section className="checkout-online-payment" aria-live="polite">
        {isPix && (payment.qrCodeBase64 || payment.qrCode) ? (
          <>
            <h3>Pague o Pix para confirmar</h3>
            {payment.qrCodeBase64 ? (
              <Image
                className="checkout-online-qr"
                src={`data:image/png;base64,${payment.qrCodeBase64}`}
                alt="QR Code Pix"
                width={220}
                height={220}
                unoptimized
              />
            ) : null}
            {payment.qrCode ? (
              <button type="button" className="btn-copy-pix" onClick={copyPix}>
                {copied ? 'Código copiado!' : 'Copiar Pix copia e cola'}
              </button>
            ) : null}
            {payment.ticketUrl ? (
              <a
                className="checkout-pix-instructions-link"
                href={payment.ticketUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir instruções do Pix
              </a>
            ) : null}
          </>
        ) : null}
        <p className="checkout-online-waiting">
          Aguardando confirmação do Mercado Pago. Não feche esta tela.
        </p>
        {onlinePaymentConfig?.sandbox && payment.providerOrderId ? (
          <p className="checkout-field-hint">
            Order ID (teste): <code>{payment.providerOrderId}</code>{' '}
            <button
              type="button"
              className="btn-copy-pix"
              onClick={() => void copyOrderId(payment.providerOrderId)}
            >
              {copiedOrderId ? 'Copiado!' : 'Copiar Order ID'}
            </button>
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <section className="checkout-online-payment">
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
          onClick={() => void submitOnlinePayment()}
          disabled={onlinePayment?.loading}
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
            await submitOnlinePayment({
              ...formData,
              payer: {
                ...(formData?.payer || {}),
                email: payerEmail || formData?.payer?.email,
              },
              payment_type_id:
                additionalData?.paymentTypeId ||
                formData?.payment_type_id ||
                'credit_card',
            });
          }}
          onError={(error) => console.error('Mercado Pago Card Brick:', error)}
        />
      ) : (
        <p>Carregando pagamento seguro…</p>
      )}
    </section>
  );
}
