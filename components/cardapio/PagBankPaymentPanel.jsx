'use client';

import { useState } from 'react';
import PixPaymentModal from '@/components/cardapio/PixPaymentModal';
import { useCardapio } from '@/context/CardapioContext';

export default function PagBankPaymentPanel() {
  const {
    checkoutData,
    onlinePaymentConfig,
    onlinePayment,
    submitOnlinePayment,
    cancelOnlinePayment,
  } = useCardapio();
  const [cancelling, setCancelling] = useState(false);
  const [localError, setLocalError] = useState('');
  const payment = onlinePayment?.payment;
  const showPixModal = Boolean(payment?.id && (payment.qrCodeBase64 || payment.qrCode));
  const checkoutDocument = String(checkoutData.cpfCnpj || '').replace(/\D/g, '');

  async function payWithPix() {
    setLocalError('');
    if (!checkoutDocument) {
      setLocalError('Informe o CPF ou CNPJ no passo de pagamento.');
      return;
    }
    try {
      await submitOnlinePayment({
        payer: {
          identification: {
            type: checkoutDocument.length > 11 ? 'CNPJ' : 'CPF',
            number: checkoutDocument,
          },
        },
      });
    } catch {
      // Erro já exibido em onlinePayment.error.
    }
  }

  async function cancelPix() {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelOnlinePayment();
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <section className="checkout-online-payment">
        <h3>Pagamento via Pix</h3>
        <p>O pedido será enviado à loja somente depois da aprovação do pagamento.</p>
        {localError || onlinePayment?.error ? (
          <div className="checkout-online-error" role="alert">
            {localError || onlinePayment.error}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">Modo sandbox ativo (ambiente de teste).</p>
        ) : null}
        <button
          type="button"
          className="btn-checkout-continue"
          onClick={() => void payWithPix()}
          disabled={onlinePayment?.loading || showPixModal}
        >
          {onlinePayment?.loading ? 'Gerando Pix…' : 'Gerar QR Code Pix'}
        </button>
      </section>

      <PixPaymentModal
        open={showPixModal}
        payment={payment}
        sandbox={Boolean(onlinePaymentConfig?.sandbox)}
        cancelling={cancelling}
        onCancel={cancelPix}
        onExpire={cancelPix}
      />
    </>
  );
}
