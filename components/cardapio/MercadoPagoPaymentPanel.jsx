'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';
import { useCardapio } from '@/context/CardapioContext';

export default function MercadoPagoPaymentPanel({ amount }) {
  const {
    checkoutData,
    onlinePaymentConfig,
    onlinePayment,
    submitOnlinePayment,
  } = useCardapio();
  const [sdkReady, setSdkReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const isPix = checkoutData.payment === 'pix_online';

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
                className="btn-copy-pix"
                href={payment.ticketUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir instruções Pix
              </a>
            ) : null}
          </>
        ) : null}
        <p className="checkout-online-waiting">
          Aguardando confirmação do Mercado Pago. Não feche esta tela.
        </p>
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
          Modo teste: use e-mail <strong>test@testuser.com</strong> (ou outro{' '}
          <strong>@testuser.com</strong>).
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
            payer: checkoutData.email
              ? { email: String(checkoutData.email).trim() }
              : undefined,
          }}
          onSubmit={async (formData, additionalData) => {
            await submitOnlinePayment({
              ...formData,
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
