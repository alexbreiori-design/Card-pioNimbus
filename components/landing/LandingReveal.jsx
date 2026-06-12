'use client';

import { useEffect, useRef, useState } from 'react';

const DEFAULT_ENTRANCE_DELAY = 90;

export default function LandingReveal({
  children,
  className = '',
  delay = 0,
  entranceDelay = DEFAULT_ENTRANCE_DELAY,
  as: Tag = 'div',
  onLoad = false,
  once = true,
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisible(true);
      return undefined;
    }

    if (onLoad) {
      const frame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const node = ref.current;
    if (!node) return undefined;

    let timer = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        timer = window.setTimeout(() => {
          setVisible(true);
        }, entranceDelay);

        if (once) observer.disconnect();
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [entranceDelay, onLoad, once]);

  return (
    <Tag
      ref={ref}
      className={`landing-reveal${visible ? ' is-visible' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
