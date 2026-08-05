'use client';

import { useEffect, useState } from 'react';
import CheckoutCardForm, { parseExpiry } from '@/components/cardapio/CheckoutCardForm';
import { useCardapio } from '@/context/CardapioContext';
import { LANDING_DEMO_CARD } from '@/lib/landing/demoMode';
import { detectCardBrand, digitsFromCard, maskCardNumberDisplay } from '@/lib/payments/cardBrand';
import { digitsOnly, formatCpfCnpjInput } from '@/lib/cpfCnpj';

export default function LandingDemoPaymentPanel({ mode = 'pix' }) {
  const {
    checkoutEmail,
    setCheckoutEmail,
    checkoutCpfCnpj,
    setCheckoutCpfCnpj,
    setCheckoutData,
    onlinePayment,
    submitOnlinePayment,
    confirmCheckoutCardDraft,
  } = useCardapio();
  const [localError, setLocalError] = useState('');
  const [card, setCard] = useState({
    holderName: LANDING_DEMO_CARD.holderName,
    number: LANDING_DEMO_CARD.number,
    expiry: LANDING_DEMO_CARD.expiry,
    securityCode: LANDING_DEMO_CARD.securityCode,
  });

  useEffect(() => {
    const email = LANDING_DEMO_CARD.email;
    const cpf = digitsOnly(LANDING_DEMO_CARD.cpfCnpj);
    setCheckoutEmail(email);
    setCheckoutCpfCnpj(formatCpfCnpjInput(cpf));
    setCheckoutData((d) => ({ ...d, email, cpfCnpj: cpf }));
  }, [setCheckoutCpfCnpj, setCheckoutData, setCheckoutEmail]);

  async function payWithPix(event) {
    event.preventDefault();
    setLocalError('');
    try {
      await submitOnlinePayment({
        email: LANDING_DEMO_CARD.email,
        cpfCnpj: digitsOnly(LANDING_DEMO_CARD.cpfCnpj),
      });
    } catch {
      setLocalError('Não foi possível simular o Pix. Tente novamente.');
    }
  }

  function continueWithCard(event) {
    event.preventDefault();
    setLocalError('');
    const { expiryMonth, expiryYear } = parseExpiry(card.expiry);
    const number = digitsFromCard(card.number);
    const holderName = card.holderName.trim();
    if (!holderName || number.length < 13 || !expiryMonth || expiryYear.length !== 4) {
      setLocalError('Revise os dados do cartão e tente novamente.');
      return;
    }
    const brand = detectCardBrand(number);
    const email = String(checkoutEmail || LANDING_DEMO_CARD.email).trim();
    const cpfCnpj = digitsOnly(checkoutCpfCnpj || LANDING_DEMO_CARD.cpfCnpj);
    setCheckoutData((d) => ({ ...d, email, cpfCnpj }));
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
        landingDemo: true,
      },
    });
  }

  if (mode === 'pix') {
    return (
      <section className="checkout-online-payment">
        <p className="checkout-field-hint" style={{ marginBottom: 12 }}>
          Demonstração: o Pix é simulado e nenhum pagamento real é gerado.
        </p>
        {localError || onlinePayment?.error ? (
          <div className="checkout-online-error" role="alert">
            {localError || onlinePayment.error}
          </div>
        ) : null}
        <button
          type="button"
          className="btn-checkout-continue"
          onClick={payWithPix}
          disabled={Boolean(onlinePayment?.loading)}
        >
          {onlinePayment?.loading ? 'Simulando…' : 'Simular Pix pago'}
        </button>
      </section>
    );
  }

  return (
    <section className="checkout-online-payment">
      <p className="checkout-field-hint" style={{ marginBottom: 12 }}>
        Demonstração: cartão pré-preenchido. Nenhum valor será cobrado.
      </p>
      {localError ? (
        <div className="checkout-online-error" role="alert">
          {localError}
        </div>
      ) : null}
      <CheckoutCardForm
        idPrefix="landing-demo"
        card={card}
        onCardChange={setCard}
        email={checkoutEmail}
        onEmailChange={(value) => {
          setCheckoutEmail(value);
          setCheckoutData((d) => ({ ...d, email: value }));
        }}
        cpfCnpj={checkoutCpfCnpj}
        onCpfCnpjChange={(value) => {
          const next = formatCpfCnpjInput(value);
          setCheckoutCpfCnpj(next);
          setCheckoutData((d) => ({ ...d, cpfCnpj: digitsOnly(next) }));
        }}
        showEmail
        showCpf
        onSubmit={continueWithCard}
        submitting={false}
        submitLabel="Continuar"
      />
    </section>
  );
}
