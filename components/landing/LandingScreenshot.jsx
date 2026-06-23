'use client';

export default function LandingScreenshot({
  src,
  alt = '',
  placeholder: _placeholder,
  priority = false,
  className = '',
  framed = false,
}) {
  if (!src) return null;

  const variantClass = framed ? 'landing-shot--framed' : 'landing-shot--loose';

  return (
    <div
      className={`landing-shot landing-shot--ready ${variantClass}${className ? ` ${className}` : ''}`}
    >
      {framed ? (
        <div className="landing-shot__frame">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="landing-shot__image"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        </div>
      ) : (
        <div className="landing-shot__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="landing-shot__image"
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
          />
        </div>
      )}
      <div className="landing-shot__glow" aria-hidden="true" />
    </div>
  );
}
