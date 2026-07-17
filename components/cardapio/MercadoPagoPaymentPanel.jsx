'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
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
        {isPix && payment.qrCodeBase64 ? (
          <>
            <h3>Pague o Pix para confirmar</h3>
            <Image
              className="checkout-online-qr"
              src={`data:image/png;base64,${payment.qrCodeBase64}`}
              alt="QR Code Pix"
              width={220}
              height={220}
              unoptimized
            />
            <button type="button" className="btn-copy-pix" onClick={copyPix}>
              {copied ? 'Código copiado!' : 'Copiar Pix copia e cola'}
            </button>
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
        <Payment
          initialization={{ amount: Number(amount) }}
          customization={{
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
            },
          }}
          onSubmit={({ formData }) => submitOnlinePayment(formData)}
          onError={(error) => console.error('Mercado Pago Brick:', error)}
        />
      ) : (
        <p>Carregando pagamento seguro…</p>
      )}
    </section>
  );
}
