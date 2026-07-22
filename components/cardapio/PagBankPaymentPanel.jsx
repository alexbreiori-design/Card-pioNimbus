'use client';

import Script from 'next/script';
import { useState } from 'react';
import CheckoutCardForm, { parseExpiry } from '@/components/cardapio/CheckoutCardForm';
import OnlinePaymentTrustBlock from '@/components/cardapio/OnlinePaymentTrustBlock';
import PixPaymentModal from '@/components/cardapio/PixPaymentModal';
import { useCardapio } from '@/context/CardapioContext';
import { detectCardBrand, digitsFromCard, maskCardNumberDisplay } from '@/lib/payments/cardBrand';
import { digitsOnly, formatCpfCnpjInput, isValidCpfCnpj } from '@/lib/cpfCnpj';

const PAGSEGURO_SDK =
  'https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js';

const SANDBOX_CARD_HINT =
  'Modo teste: use Visa 4539 6206 5992 2097, validade 12/2026, CVV 123 (aprovado).';

function loadPagSeguroEncrypt() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('SDK indisponível.'));
  }
  if (typeof window.PagSeguro?.encryptCard === 'function') {
    return Promise.resolve(window.PagSeguro);
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-pagseguro-sdk="1"]');
    const onReady = () => {
      if (typeof window.PagSeguro?.encryptCard === 'function') {
        resolve(window.PagSeguro);
      } else {
        reject(new Error('Não foi possível carregar a criptografia do PagBank.'));
      }
    };
    if (existing) {
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Falha ao carregar o SDK do PagBank.')),
        { once: true }
      );
      if (typeof window.PagSeguro?.encryptCard === 'function') onReady();
      return;
    }
    const script = document.createElement('script');
    script.src = PAGSEGURO_SDK;
    script.async = true;
    script.dataset.pagseguroSdk = '1';
    script.onload = onReady;
    script.onerror = () => reject(new Error('Falha ao carregar o SDK do PagBank.'));
    document.body.appendChild(script);
  });
}

export default function PagBankPaymentPanel({ mode = 'pix' }) {
  const {
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
  const payment = onlinePayment?.payment;
  const showPixModal = Boolean(
    mode === 'pix' && payment?.id && (payment.qrCodeBase64 || payment.qrCode)
  );
  const publicKey = String(onlinePaymentConfig?.publicKey || '').trim();

  function syncPayer({ email, cpfCnpj }) {
    const nextEmail = String(email ?? checkoutEmail ?? '').trim();
    const nextCpf = digitsOnly(cpfCnpj ?? checkoutCpfCnpj ?? '');
    setCheckoutEmail(nextEmail);
    setCheckoutCpfCnpj(formatCpfCnpjInput(nextCpf));
    setCheckoutData((d) => ({ ...d, email: nextEmail, cpfCnpj: nextCpf }));
    return { email: nextEmail, cpfCnpj: nextCpf };
  }

  async function payWithPix() {
    setLocalError('');
    const { email, cpfCnpj } = syncPayer({
      email: checkoutEmail,
      cpfCnpj: checkoutCpfCnpj,
    });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Informe um e-mail válido.');
      return;
    }
    if (!isValidCpfCnpj(cpfCnpj)) {
      setLocalError('Informe um CPF ou CNPJ válido.');
      return;
    }
    try {
      await submitOnlinePayment({
        email,
        cpfCnpj,
        payer: {
          identification: {
            type: cpfCnpj.length > 11 ? 'CNPJ' : 'CPF',
            number: cpfCnpj,
          },
        },
      });
    } catch {
      // Erro já exibido em onlinePayment.error.
    }
  }

  async function continueWithCard(event) {
    event.preventDefault();
    setLocalError('');
    if (!publicKey) {
      setLocalError('Pagamento com cartão indisponível no momento. Tente novamente em instantes.');
      return;
    }
    const { email, cpfCnpj } = syncPayer({
      email: checkoutEmail,
      cpfCnpj: checkoutCpfCnpj,
    });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Informe um e-mail válido.');
      return;
    }
    if (!isValidCpfCnpj(cpfCnpj)) {
      setLocalError('Informe um CPF ou CNPJ válido.');
      return;
    }
    const holderName = card.holderName.trim();
    const number = digitsFromCard(card.number);
    const { expiryMonth, expiryYear } = parseExpiry(card.expiry);
    const securityCode = digitsFromCard(card.securityCode);
    if (!holderName || number.length < 13 || !expiryMonth || expiryYear.length !== 4 || !securityCode) {
      setLocalError('Revise os dados do cartão e tente novamente.');
      return;
    }

    try {
      const PagSeguro = await loadPagSeguroEncrypt();
      const encrypted = PagSeguro.encryptCard({
        publicKey,
        holder: holderName,
        number,
        expMonth: expiryMonth.padStart(2, '0'),
        expYear: expiryYear,
        securityCode,
      });
      if (encrypted?.hasErrors) {
        const first = Array.isArray(encrypted.errors) ? encrypted.errors[0] : null;
        throw new Error(first?.message || 'Não foi possível criptografar o cartão.');
      }
      const encryptedCard = String(encrypted?.encryptedCard || '').trim();
      if (!encryptedCard) {
        throw new Error('Não foi possível criptografar o cartão.');
      }
      const brand = detectCardBrand(number);
      confirmCheckoutCardDraft({
        brand,
        last4: number.slice(-4),
        masked: maskCardNumberDisplay(number),
        payload: {          email,
          cpfCnpj,
          encryptedCard,
          holderName,
          payer: {
            email,
            identification: {
              type: cpfCnpj.length > 11 ? 'CNPJ' : 'CPF',
              number: cpfCnpj,
            },
          },
        },
      });
    } catch (error) {
      setLocalError(error?.message || 'Não foi possível validar o cartão.');
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
            Aguardando confirmação do PagBank. Não feche esta tela.
          </p>
        ) : null}
      </section>
    );
  }

  if (mode === 'collect') {
    return (
      <section className="checkout-online-payment">
        <Script src={PAGSEGURO_SDK} strategy="afterInteractive" data-pagseguro-sdk="1" />
        <OnlinePaymentTrustBlock provider="pagbank" />
        {localError ? (
          <div className="checkout-online-error" role="alert">
            {localError}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">{SANDBOX_CARD_HINT}</p>
        ) : null}
        <CheckoutCardForm
          idPrefix="pagbank"
          card={card}
          onCardChange={setCard}
          email={checkoutEmail}
          onEmailChange={setCheckoutEmail}
          cpfCnpj={checkoutCpfCnpj}
          onCpfCnpjChange={(value) => setCheckoutCpfCnpj(formatCpfCnpjInput(value))}
          showEmail
          showCpf
          onSubmit={(event) => void continueWithCard(event)}
          submitting={false}
          disabled={!publicKey}
          submitLabel="Continuar"
        />
      </section>
    );
  }

  return (
    <>
      <section className="checkout-online-payment">
        <OnlinePaymentTrustBlock provider="pagbank" />
        {localError || onlinePayment?.error ? (
          <div className="checkout-online-error" role="alert">
            {localError || onlinePayment.error}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">Modo sandbox ativo (ambiente de teste).</p>
        ) : null}
        <div className="checkout-card-field">
          <label className="form-label" htmlFor="pagbank-pix-email">
            E-mail
          </label>
          <input
            id="pagbank-pix-email"
            className="form-input"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={checkoutEmail}
            onChange={(e) => setCheckoutEmail(e.target.value)}
          />
        </div>
        <div className="checkout-card-field">
          <label className="form-label" htmlFor="pagbank-pix-cpf">
            CPF ou CNPJ
          </label>
          <input
            id="pagbank-pix-cpf"
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
        onCancel={cancelPix}
        onExpire={cancelPix}
      />
    </>
  );
}
