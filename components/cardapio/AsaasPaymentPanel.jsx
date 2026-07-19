'use client';

import { useState } from 'react';
import PixPaymentModal from '@/components/cardapio/PixPaymentModal';
import { useCardapio } from '@/context/CardapioContext';

export default function AsaasPaymentPanel() {
  const {
    checkoutData,
    onlinePaymentConfig,
    onlinePayment,
    submitOnlinePayment,
    cancelOnlinePayment,
  } = useCardapio();
  const [cancelling, setCancelling] = useState(false);
  const [localError, setLocalError] = useState('');
  const [cardForm, setCardForm] = useState({
    holderName: '',
    email: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    postalCode: '',
    addressNumber: '',
  });
  const isPix = checkoutData.payment === 'pix_online';
  const payment = onlinePayment?.payment;
  const showPixModal = Boolean(isPix && payment?.id && (payment.qrCodeBase64 || payment.qrCode));
  const checkoutDocument = String(checkoutData.cpfCnpj || '').replace(/\D/g, '');

  async function handleCancelPix() {
    if (cancelling) return;
    setCancelling(true);
    try {
      await cancelOnlinePayment();
    } finally {
      setCancelling(false);
    }
  }

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
      // Erro já exibido em onlinePayment.error
    }
  }

  async function payWithCard(event) {
    event.preventDefault();
    const email = String(cardForm.email || '').trim();
    if (!checkoutDocument) {
      setLocalError('Informe o CPF ou CNPJ no passo de pagamento.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Informe um e-mail válido do titular do cartão.');
      return;
    }
    setLocalError('');
    try {
      await submitOnlinePayment({
        creditCard: {
          holderName: cardForm.holderName.trim(),
          number: cardForm.number,
          expiryMonth: cardForm.expiryMonth,
          expiryYear: cardForm.expiryYear,
          ccv: cardForm.ccv,
        },
        creditCardHolderInfo: {
          name: cardForm.holderName.trim(),
          email,
          cpfCnpj: checkoutDocument,
          postalCode: cardForm.postalCode.replace(/\D/g, ''),
          addressNumber: cardForm.addressNumber.trim(),
          phone: String(checkoutData.phone || '').replace(/\D/g, ''),
        },
        payer: {
          email,
          identification: {
            type: checkoutDocument.length > 11 ? 'CNPJ' : 'CPF',
            number: checkoutDocument,
          },
        },
      });
    } catch {
      // Erro já exibido em onlinePayment.error
    }
  }

  if (payment && !isPix) {
    return (
      <section className="checkout-online-payment" aria-live="polite">
        <p className="checkout-online-waiting">
          Aguardando confirmação do Asaas. Não feche esta tela.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="checkout-online-payment">
        <h3>{isPix ? 'Pagamento via Pix' : 'Pagamento com cartão'}</h3>
        <p>O pedido será enviado à loja somente depois da aprovação do pagamento.</p>
        {(localError || onlinePayment?.error) ? (
          <div className="checkout-online-error" role="alert">
            {localError || onlinePayment.error}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">Modo sandbox Asaas ativo.</p>
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
        ) : (
          <form className="checkout-asaas-card-form" onSubmit={(event) => void payWithCard(event)}>
            <label className="form-label" htmlFor="asaas-holder">
              Nome no cartão
            </label>
            <input
              id="asaas-holder"
              className="form-input"
              value={cardForm.holderName}
              onChange={(e) => setCardForm((c) => ({ ...c, holderName: e.target.value }))}
              required
            />
            <label className="form-label" htmlFor="asaas-email">
              E-mail do titular
            </label>
            <input
              id="asaas-email"
              className="form-input"
              type="email"
              autoComplete="email"
              value={cardForm.email}
              onChange={(e) => setCardForm((c) => ({ ...c, email: e.target.value }))}
              required
            />
            <label className="form-label" htmlFor="asaas-number">
              Número do cartão
            </label>
            <input
              id="asaas-number"
              className="form-input"
              inputMode="numeric"
              value={cardForm.number}
              onChange={(e) => setCardForm((c) => ({ ...c, number: e.target.value }))}
              required
            />
            <div className="checkout-asaas-card-row">
              <div>
                <label className="form-label" htmlFor="asaas-exp-m">
                  Mês
                </label>
                <input
                  id="asaas-exp-m"
                  className="form-input"
                  placeholder="MM"
                  maxLength={2}
                  value={cardForm.expiryMonth}
                  onChange={(e) => setCardForm((c) => ({ ...c, expiryMonth: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="asaas-exp-y">
                  Ano
                </label>
                <input
                  id="asaas-exp-y"
                  className="form-input"
                  placeholder="AAAA"
                  maxLength={4}
                  value={cardForm.expiryYear}
                  onChange={(e) => setCardForm((c) => ({ ...c, expiryYear: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="asaas-ccv">
                  CVV
                </label>
                <input
                  id="asaas-ccv"
                  className="form-input"
                  inputMode="numeric"
                  maxLength={4}
                  value={cardForm.ccv}
                  onChange={(e) => setCardForm((c) => ({ ...c, ccv: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="checkout-asaas-card-row">
              <div>
                <label className="form-label" htmlFor="asaas-cep">
                  CEP
                </label>
                <input
                  id="asaas-cep"
                  className="form-input"
                  inputMode="numeric"
                  value={cardForm.postalCode}
                  onChange={(e) => setCardForm((c) => ({ ...c, postalCode: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="asaas-num">
                  Nº
                </label>
                <input
                  id="asaas-num"
                  className="form-input"
                  value={cardForm.addressNumber}
                  onChange={(e) => setCardForm((c) => ({ ...c, addressNumber: e.target.value }))}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn-checkout-continue"
              disabled={onlinePayment?.loading}
            >
              {onlinePayment?.loading ? 'Processando…' : 'Pagar com cartão'}
            </button>
          </form>
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
