'use client';

import { useState } from 'react';

export default function LandingScreenshot({
  src,
  alt = '',
  placeholder,
  priority = false,
  className = '',
}) {
  const [failed, setFailed] = useState(!src);

  return (
    <div className={`landing-shot${className ? ` ${className}` : ''}`}>
      <div className="landing-shot__frame">
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="landing-shot__image"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="landing-shot__placeholder" aria-hidden="true">
            <span className="landing-shot__placeholder-icon" />
            <span className="landing-shot__placeholder-label">{placeholder || 'Screenshot em breve'}</span>
          </div>
        )}
      </div>
      <div className="landing-shot__glow" aria-hidden="true" />
    </div>
  );
}
