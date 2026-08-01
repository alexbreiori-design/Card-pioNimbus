'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Tooltip customizado do admin (substitui title nativo).
 * Aparece quase na hora no hover/focus.
 */
export default function AdminTooltip({
  content = '',
  children,
  delayMs = 60,
  side = 'top',
  variant = 'dark',
  className = '',
}) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const text = String(content || '').trim();

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = null;
  }

  function show() {
    if (!text) return;
    clearTimer();
    timerRef.current = window.setTimeout(() => setOpen(true), delayMs);
  }

  function hide() {
    clearTimer();
    setOpen(false);
  }

  if (!text) return children;

  return (
    <span
      className={`admin-tooltip-wrap ${className}`.trim()}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className={`admin-tooltip admin-tooltip--${side} admin-tooltip--${variant}`}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
