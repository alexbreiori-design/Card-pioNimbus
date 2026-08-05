'use client';

import { useEffect, useState } from 'react';

/**
 * Slideshow com fade entre imagens.
 * O tempo total (durationMs) é dividido igualmente entre as imagens.
 * Com loop=true (preview SA), reinicia após a última.
 */
export default function WhatsNewImageSlideshow({
  urls = [],
  durationMs = 8000,
  replayKey = 0,
  loop = false,
  showDots = true,
}) {
  const slides = (urls || []).filter(Boolean);
  const count = slides.length;
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [replayKey, count]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const perMs = Math.max(600, Math.floor(durationMs / count));
    if (!loop && active >= count - 1) return undefined;
    const timer = window.setTimeout(() => {
      setActive((index) => {
        if (loop) return (index + 1) % count;
        return Math.min(count - 1, index + 1);
      });
    }, perMs);
    return () => window.clearTimeout(timer);
  }, [active, count, durationMs, replayKey, loop]);

  if (!count) {
    return <div className="admin-whats-new-media-empty">Sem prévia</div>;
  }

  if (count === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className="admin-whats-new-media-el" src={slides[0]} alt="" />
    );
  }

  return (
    <div className="admin-whats-new-slideshow" aria-hidden="true">
      {slides.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${url}-${index}`}
          className={`admin-whats-new-media-el admin-whats-new-slideshow-frame${
            index === active ? ' is-active' : ''
          }`}
          src={url}
          alt=""
        />
      ))}
      {showDots ? (
        <div className="admin-whats-new-slideshow-dots">
          {slides.map((_, index) => (
            <span
              key={`dot-${index}`}
              className={`admin-whats-new-slideshow-dot${index === active ? ' is-active' : ''}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
