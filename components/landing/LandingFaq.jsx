'use client';

import { useId, useState } from 'react';

function PlusMinusIcon({ open }) {
  return (
    <span className={`landing-faq-toggle${open ? ' landing-faq-toggle--open' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" className="landing-faq-toggle__icon">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        {!open ? (
          <path d="M12 8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        ) : null}
      </svg>
    </span>
  );
}

export default function LandingFaq({ items }) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <div className="landing-faq-stack">
      {items.map((item, index) => {
        const open = openIndex === index;
        const panelId = `${baseId}-panel-${index}`;
        const buttonId = `${baseId}-button-${index}`;

        return (
          <div
            key={item.q}
            className={`landing-glass-card landing-faq-item-card landing-interactive${open ? ' landing-faq-item-card--open' : ''}`}
          >
            <button
              id={buttonId}
              type="button"
              className="landing-faq-item__trigger"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setOpenIndex(open ? -1 : index)}
            >
              <span className="landing-faq-item__question">{item.q}</span>
              <PlusMinusIcon open={open} />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`landing-faq-item__panel${open ? ' landing-faq-item__panel--open' : ''}`}
            >
              <div className="landing-faq-item__panel-inner">
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
