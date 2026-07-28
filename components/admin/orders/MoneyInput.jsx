'use client';

import { formatMoneyBrInput } from '@/lib/moneyMask';

export default function MoneyInput({
  label,
  value,
  onChange,
  placeholder = '0,00',
  className = '',
  disabled = false,
  /** Máscara R$ 0,00 (sem prefixo fixo; R$ só ao digitar) */
  currencyMask = false,
}) {
  function handleChange(event) {
    const next = event.target.value;
    onChange(currencyMask ? formatMoneyBrInput(next) : next);
  }

  if (currencyMask) {
    return (
      <div className={`admin-form-group ${className}`.trim()}>
        {label ? <label className="admin-label">{label}</label> : null}
        <input
          className="admin-input"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={handleChange}
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className={`admin-form-group ${className}`.trim()}>
      {label ? <label className="admin-label">{label}</label> : null}
      <div className="admin-input-prefix-wrap">
        <span className="admin-input-prefix" aria-hidden="true">
          $
        </span>
        <input
          className="admin-input admin-input-with-prefix"
          inputMode="decimal"
          value={value}
          disabled={disabled}
          onChange={handleChange}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
