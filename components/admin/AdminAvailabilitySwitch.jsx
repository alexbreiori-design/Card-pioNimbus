'use client';

export default function AdminAvailabilitySwitch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`admin-switch-button ${checked ? 'checked' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
