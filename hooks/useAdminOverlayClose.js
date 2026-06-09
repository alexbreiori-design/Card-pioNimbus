'use client';

import { useCallback, useRef, useState } from 'react';

function hasActiveTextSelection() {
  const selection = window.getSelection();
  return Boolean(selection && selection.type === 'Range' && selection.toString().trim());
}

export function useAdminOverlayClose({ onClose, isDirty = false }) {
  const pointerDownOnOverlayRef = useRef(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  const overlayPointerDown = useCallback((event) => {
    pointerDownOnOverlayRef.current = event.target === event.currentTarget;
  }, []);

  const requestClose = useCallback(() => {
    if (isDirty) {
      setDiscardOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const overlayClick = useCallback(
    (event) => {
      if (event.target !== event.currentTarget) return;
      if (!pointerDownOnOverlayRef.current) return;
      if (hasActiveTextSelection()) return;
      requestClose();
    },
    [requestClose]
  );

  const confirmDiscard = useCallback(() => {
    setDiscardOpen(false);
    onClose();
  }, [onClose]);

  const cancelDiscard = useCallback(() => {
    setDiscardOpen(false);
  }, []);

  return {
    overlayPointerDown,
    overlayClick,
    requestClose,
    discardOpen,
    confirmDiscard,
    cancelDiscard,
  };
}
