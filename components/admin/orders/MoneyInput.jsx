'use client';

export default function MoneyInput({ label, value, onChange, className = '' }) {
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
          onChange={(e) => onChange(e.target.value)}
          placeholder="0,00"
        />
      </div>
    </div>
  );
}
