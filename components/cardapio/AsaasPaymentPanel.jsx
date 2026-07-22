'use client';

import { useState } from 'react';
import CheckoutCardForm, { parseExpiry } from '@/components/cardapio/CheckoutCardForm';
import OnlinePaymentTrustBlock from '@/components/cardapio/OnlinePaymentTrustBlock';
import PixPaymentModal from '@/components/cardapio/PixPaymentModal';
import { useCardapio } from '@/context/CardapioContext';
import { detectCardBrand, digitsFromCard, maskCardNumberDisplay } from '@/lib/payments/cardBrand';
import { digitsOnly, formatCpfCnpjInput, isValidCpfCnpj } from '@/lib/cpfCnpj';

export default function AsaasPaymentPanel({ mode = 'pix' }) {
  const {
    checkoutData,
    checkoutEmail,
    setCheckoutEmail,
    checkoutCpfCnpj,
    setCheckoutCpfCnpj,
    setCheckoutData,
    onlinePaymentConfig,
    onlinePayment,
    submitOnlinePayment,
    cancelOnlinePayment,
    confirmCheckoutCardDraft,
  } = useCardapio();
  const [cancelling, setCancelling] = useState(false);
  const [localError, setLocalError] = useState('');
  const [card, setCard] = useState({
    holderName: '',
    number: '',
    expiry: '',
    securityCode: '',
  });
  const [postalCode, setPostalCode] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const payment = onlinePayment?.payment;
  const showPixModal = Boolean(
    mode === 'pix' && payment?.id && (payment.qrCodeBase64 || payment.qrCode)
  );

  function syncPayer({ email, cpfCnpj }) {
    const nextEmail = String(email ?? checkoutEmail ?? '').trim();
    const nextCpf = digitsOnly(cpfCnpj ?? checkoutCpfCnpj ?? '');
    setCheckoutEmail(nextEmail);
    setCheckoutCpfCnpj(formatCpfCnpjInput(nextCpf));
    setCheckoutData((d) => ({ ...d, email: nextEmail, cpfCnpj: nextCpf }));
    return { email: nextEmail, cpfCnpj: nextCpf };
  }

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
    const { cpfCnpj } = syncPayer({ cpfCnpj: checkoutCpfCnpj });
    if (!isValidCpfCnpj(cpfCnpj)) {
      setLocalError('Informe um CPF ou CNPJ válido.');
      return;
    }
    try {
      await submitOnlinePayment({
        cpfCnpj,
        payer: {
          identification: {
            type: cpfCnpj.length > 11 ? 'CNPJ' : 'CPF',
            number: cpfCnpj,
          },
        },
      });
    } catch {
      // Erro já exibido em onlinePayment.error
    }
  }

  function continueWithCard(event) {
    event.preventDefault();
    setLocalError('');
    const email = String(checkoutEmail || '').trim();
    const { cpfCnpj } = syncPayer({ email, cpfCnpj: checkoutCpfCnpj });
    if (!isValidCpfCnpj(cpfCnpj)) {
      setLocalError('Informe um CPF ou CNPJ válido.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Informe um e-mail válido do titular do cartão.');
      return;
    }
    const { expiryMonth, expiryYear } = parseExpiry(card.expiry);
    const number = digitsFromCard(card.number);
    const holderName = card.holderName.trim();
    if (!holderName || number.length < 13 || !expiryMonth || expiryYear.length !== 4) {
      setLocalError('Revise os dados do cartão e tente novamente.');
      return;
    }
    const brand = detectCardBrand(number);
    confirmCheckoutCardDraft({
      brand,
      last4: number.slice(-4),
      masked: maskCardNumberDisplay(number),
      payload: {
        email,
        cpfCnpj,
        creditCard: {
          holderName,
          number,
          expiryMonth,
          expiryYear,
          ccv: card.securityCode,
        },
        creditCardHolderInfo: {
          name: holderName,
          email,
          cpfCnpj,
          postalCode: digitsOnly(postalCode),
          addressNumber: addressNumber.trim(),
          phone: digitsOnly(checkoutData.phone),
        },
        payer: {
          email,
          identification: {
            type: cpfCnpj.length > 11 ? 'CNPJ' : 'CPF',
            number: cpfCnpj,
          },
        },
      },
    });
  }

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
            Aguardando confirmação do Asaas. Não feche esta tela.
          </p>
        ) : null}
      </section>
    );
  }

  if (mode === 'collect') {
    return (
      <section className="checkout-online-payment">
        <OnlinePaymentTrustBlock provider="asaas" />
        {localError ? (
          <div className="checkout-online-error" role="alert">
            {localError}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">Modo sandbox ativo (ambiente de teste).</p>
        ) : null}
        <CheckoutCardForm
          idPrefix="asaas"
          card={card}
          onCardChange={setCard}
          email={checkoutEmail}
          onEmailChange={setCheckoutEmail}
          cpfCnpj={checkoutCpfCnpj}
          onCpfCnpjChange={(value) => setCheckoutCpfCnpj(formatCpfCnpjInput(value))}
          showEmail
          showCpf
          showAddress
          postalCode={postalCode}
          onPostalCodeChange={setPostalCode}
          addressNumber={addressNumber}
          onAddressNumberChange={setAddressNumber}
          onSubmit={continueWithCard}
          submitting={false}
          submitLabel="Continuar"
        />
      </section>
    );
  }

  return (
    <>
      <section className="checkout-online-payment">
        <OnlinePaymentTrustBlock provider="asaas" />
        {(localError || onlinePayment?.error) ? (
          <div className="checkout-online-error" role="alert">
            {localError || onlinePayment.error}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">Modo sandbox ativo (ambiente de teste).</p>
        ) : null}
        <div className="checkout-card-field">
          <label className="form-label" htmlFor="asaas-pix-cpf">
            CPF ou CNPJ
          </label>
          <input
            id="asaas-pix-cpf"
            className="form-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={checkoutCpfCnpj}
            onChange={(e) => setCheckoutCpfCnpj(formatCpfCnpjInput(e.target.value))}
          />
        </div>
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
