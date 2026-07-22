'use client';

import Script from 'next/script';
import { useState } from 'react';
import PixPaymentModal from '@/components/cardapio/PixPaymentModal';
import { useCardapio } from '@/context/CardapioContext';

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
      // Já pode ter carregado antes dos listeners.
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
  const [cardForm, setCardForm] = useState({
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    securityCode: '',
  });
  const isPix = checkoutData.payment === 'pix_online';
  const payment = onlinePayment?.payment;
  const showPixModal = Boolean(isPix && payment?.id && (payment.qrCodeBase64 || payment.qrCode));
  const checkoutDocument = String(checkoutData.cpfCnpj || '').replace(/\D/g, '');
  const publicKey = String(onlinePaymentConfig?.publicKey || '').trim();

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

  async function payWithCard(event) {
    event.preventDefault();
    setLocalError('');
    if (!checkoutDocument) {
      setLocalError('Informe o CPF ou CNPJ no passo de pagamento.');
      return;
    }
    if (!publicKey) {
      setLocalError('Pagamento com cartão indisponível no momento. Tente novamente em instantes.');
      return;
    }
    const holderName = cardForm.holderName.trim();
    const number = cardForm.number.replace(/\D/g, '');
    const expMonth = cardForm.expiryMonth.replace(/\D/g, '').padStart(2, '0');
    let expYear = cardForm.expiryYear.replace(/\D/g, '');
    if (expYear.length === 2) expYear = `20${expYear}`;
    const securityCode = cardForm.securityCode.replace(/\D/g, '');
    if (!holderName || number.length < 13 || !expMonth || expYear.length !== 4 || !securityCode) {
      setLocalError('Revise os dados do cartão e tente novamente.');
      return;
    }

    try {
      const PagSeguro = await loadPagSeguroEncrypt();
      const encrypted = PagSeguro.encryptCard({
        publicKey,
        holder: holderName,
        number,
        expMonth,
        expYear,
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
      await submitOnlinePayment({
        encryptedCard,
        holderName,
        payer: {
          identification: {
            type: checkoutDocument.length > 11 ? 'CNPJ' : 'CPF',
            number: checkoutDocument,
          },
        },
      });
    } catch (error) {
      setLocalError(error?.message || 'Não foi possível pagar com cartão.');
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

  if (payment && !isPix) {
    return (
      <section className="checkout-online-payment" aria-live="polite">
        <p className="checkout-online-waiting">
          Aguardando confirmação do PagBank. Não feche esta tela.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="checkout-online-payment">
        {!isPix ? (
          <Script src={PAGSEGURO_SDK} strategy="afterInteractive" data-pagseguro-sdk="1" />
        ) : null}
        <h3>{isPix ? 'Pagamento via Pix' : 'Pagamento com cartão'}</h3>
        <p>O pedido será enviado à loja somente depois da aprovação do pagamento.</p>
        {localError || onlinePayment?.error ? (
          <div className="checkout-online-error" role="alert">
            {localError || onlinePayment.error}
          </div>
        ) : null}
        {onlinePaymentConfig?.sandbox ? (
          <p className="checkout-field-hint">
            {isPix ? 'Modo sandbox ativo (ambiente de teste).' : SANDBOX_CARD_HINT}
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
        ) : (
          <form className="checkout-asaas-card-form" onSubmit={(event) => void payWithCard(event)}>
            <label className="form-label" htmlFor="pagbank-holder">
              Nome no cartão
            </label>
            <input
              id="pagbank-holder"
              className="form-input"
              value={cardForm.holderName}
              onChange={(e) => setCardForm((c) => ({ ...c, holderName: e.target.value }))}
              autoComplete="cc-name"
              required
            />
            <label className="form-label" htmlFor="pagbank-number">
              Número do cartão
            </label>
            <input
              id="pagbank-number"
              className="form-input"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardForm.number}
              onChange={(e) => setCardForm((c) => ({ ...c, number: e.target.value }))}
              required
            />
            <div className="checkout-asaas-card-row">
              <div>
                <label className="form-label" htmlFor="pagbank-exp-m">
                  Mês
                </label>
                <input
                  id="pagbank-exp-m"
                  className="form-input"
                  placeholder="MM"
                  maxLength={2}
                  inputMode="numeric"
                  autoComplete="cc-exp-month"
                  value={cardForm.expiryMonth}
                  onChange={(e) => setCardForm((c) => ({ ...c, expiryMonth: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="pagbank-exp-y">
                  Ano
                </label>
                <input
                  id="pagbank-exp-y"
                  className="form-input"
                  placeholder="AAAA"
                  maxLength={4}
                  inputMode="numeric"
                  autoComplete="cc-exp-year"
                  value={cardForm.expiryYear}
                  onChange={(e) => setCardForm((c) => ({ ...c, expiryYear: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="form-label" htmlFor="pagbank-cvv">
                  CVV
                </label>
                <input
                  id="pagbank-cvv"
                  className="form-input"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={4}
                  value={cardForm.securityCode}
                  onChange={(e) => setCardForm((c) => ({ ...c, securityCode: e.target.value }))}
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn-checkout-continue"
              disabled={onlinePayment?.loading || !publicKey}
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
        onCancel={cancelPix}
        onExpire={cancelPix}
      />
    </>
  );
}
