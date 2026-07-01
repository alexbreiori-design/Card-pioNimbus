'use client';

import { useEffect } from 'react';

const ALLOWED_SELECTOR = 'input, textarea, select, [contenteditable="true"]';

function shouldAllowContextMenu(target) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(ALLOWED_SELECTOR));
}

/** Bloqueia clique direito no cardápio (deterrente — não impede DevTools). */
export default function CardapioContextMenuGuard() {
  useEffect(() => {
    const onContextMenu = (event) => {
      if (shouldAllowContextMenu(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  return null;
}
