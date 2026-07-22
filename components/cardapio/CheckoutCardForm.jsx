'use client';

/** Ícones simplificados das bandeiras (apenas visual de confiança). */
function BrandMark({ brand }) {
  if (brand === 'mastercard') {
    return (
      <span className="checkout-card-brand checkout-card-brand--mc" title="Mastercard" aria-hidden>
        <span className="checkout-card-brand-mc-l" />
        <span className="checkout-card-brand-mc-r" />
      </span>
    );
  }
  if (brand === 'visa') {
    return (
      <span className="checkout-card-brand checkout-card-brand--visa" title="Visa" aria-hidden>
        VISA
      </span>
    );
  }
  if (brand === 'elo') {
    return (
      <span className="checkout-card-brand checkout-card-brand--elo" title="Elo" aria-hidden>
        elo
      </span>
    );
  }
  return (
    <span className="checkout-card-brand checkout-card-brand--amex" title="American Express" aria-hidden>
      AMEX
    </span>
  );
}

function CvvIcon() {
  return (
    <svg
      className="checkout-card-cvv-icon"
      width="22"
      height="16"
      viewBox="0 0 22 16"
      fill="none"
      aria-hidden
    >
      <rect x="0.75" y="0.75" width="20.5" height="14.5" rx="2.25" stroke="currentColor" strokeWidth="1.5" />
      <rect x="0.75" y="3.5" width="20.5" height="3" fill="currentColor" opacity="0.25" />
      <circle cx="14.5" cy="10.5" r="1.1" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="1.1" fill="currentColor" />
      <circle cx="11.5" cy="10.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function formatCardNumberInput(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 19);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function formatExpiryInput(value) {
  const digits = String(value || '')
    .replace(/\D/g, '')
    .slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function parseExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const expiryMonth = digits.slice(0, 2);
  let expiryYear = digits.slice(2, 4);
  if (expiryYear.length === 2) expiryYear = `20${expiryYear}`;
  return { expiryMonth, expiryYear };
}

/**
 * Formulário de cartão no padrão visual do Mercado Pago / referência enviada.
 * Campos extras (e-mail, CPF, endereço) ficam opcionais por provedor.
 */
export default function CheckoutCardForm({
  idPrefix = 'card',
  card,
  onCardChange,
  email = '',
  onEmailChange,
  cpfCnpj = '',
  onCpfCnpjChange,
  showEmail = false,
  showCpf = false,
  showAddress = false,
  postalCode = '',
  onPostalCodeChange,
  addressNumber = '',
  onAddressNumberChange,
  onSubmit,
  submitting = false,
  submitLabel = 'Finalizar pagamento',
  disabled = false,
}) {
  return (
    <form className="checkout-card-form" onSubmit={onSubmit}>
      <header className="checkout-card-form-header">
        <h3 className="checkout-card-form-title">Cartão de crédito ou débito</h3>
        <div className="checkout-card-brands" aria-label="Bandeiras aceitas">
          <BrandMark brand="mastercard" />
          <BrandMark brand="visa" />
          <BrandMark brand="elo" />
          <BrandMark brand="amex" />
        </div>
      </header>

      {showEmail ? (
        <div className="checkout-card-field">
          <label className="form-label" htmlFor={`${idPrefix}-email`}>
            E-mail
          </label>
          <input
            id={`${idPrefix}-email`}
            className="form-input"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => onEmailChange?.(e.target.value)}
            required
          />
        </div>
      ) : null}

      {showCpf ? (
        <div className="checkout-card-field">
          <label className="form-label" htmlFor={`${idPrefix}-cpf`}>
            CPF ou CNPJ
          </label>
          <input
            id={`${idPrefix}-cpf`}
            className="form-input"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpfCnpj}
            onChange={(e) => onCpfCnpjChange?.(e.target.value)}
            required
          />
        </div>
      ) : null}

      <div className="checkout-card-field">
        <label className="form-label" htmlFor={`${idPrefix}-number`}>
          Número do cartão
        </label>
        <input
          id={`${idPrefix}-number`}
          className="form-input"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 1234 1234 1234"
          value={card.number}
          onChange={(e) =>
            onCardChange({ ...card, number: formatCardNumberInput(e.target.value) })
          }
          required
        />
      </div>

      <div className="checkout-card-row">
        <div className="checkout-card-field">
          <label className="form-label" htmlFor={`${idPrefix}-expiry`}>
            Data de vencimento
          </label>
          <input
            id={`${idPrefix}-expiry`}
            className="form-input"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="mm/aa"
            maxLength={5}
            value={card.expiry}
            onChange={(e) =>
              onCardChange({ ...card, expiry: formatExpiryInput(e.target.value) })
            }
            required
          />
        </div>
        <div className="checkout-card-field">
          <label className="form-label" htmlFor={`${idPrefix}-cvv`}>
            Código de segurança
          </label>
          <div className="checkout-card-cvv-wrap">
            <input
              id={`${idPrefix}-cvv`}
              className="form-input"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="Ex.: 123"
              maxLength={4}
              value={card.securityCode}
              onChange={(e) =>
                onCardChange({
                  ...card,
                  securityCode: e.target.value.replace(/\D/g, '').slice(0, 4),
                })
              }
              required
            />
            <CvvIcon />
          </div>
        </div>
      </div>

      <div className="checkout-card-field">
        <label className="form-label" htmlFor={`${idPrefix}-holder`}>
          Nome do titular como aparece no cartão
        </label>
        <input
          id={`${idPrefix}-holder`}
          className="form-input"
          autoComplete="cc-name"
          placeholder="Maria Santos Pereira"
          value={card.holderName}
          onChange={(e) => onCardChange({ ...card, holderName: e.target.value })}
          required
        />
      </div>

      {showAddress ? (
        <div className="checkout-card-row">
          <div className="checkout-card-field">
            <label className="form-label" htmlFor={`${idPrefix}-cep`}>
              CEP do titular
            </label>
            <input
              id={`${idPrefix}-cep`}
              className="form-input"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="00000-000"
              value={postalCode}
              onChange={(e) => onPostalCodeChange?.(e.target.value)}
              required
            />
          </div>
          <div className="checkout-card-field checkout-card-field--narrow">
            <label className="form-label" htmlFor={`${idPrefix}-addr-num`}>
              Nº
            </label>
            <input
              id={`${idPrefix}-addr-num`}
              className="form-input"
              autoComplete="address-line2"
              value={addressNumber}
              onChange={(e) => onAddressNumberChange?.(e.target.value)}
              required
            />
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        className="btn-checkout-continue"
        disabled={submitting || disabled}
      >
        {submitting ? 'Processando…' : submitLabel}
      </button>
    </form>
  );
}
