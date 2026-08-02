'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminData } from '@/hooks/useAdminData';
import WhatsNewModal from './WhatsNewModal';

export const WHATS_NEW_OPEN_EVENT = 'nimbus:whats-new-open';

export function openWhatsNewReplay() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WHATS_NEW_OPEN_EVENT, { detail: { mode: 'all' } }));
}

export default function WhatsNewGate() {
  const { activeSlug, ready } = useAdminData();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('unseen');
  const [acknowledging, setAcknowledging] = useState(false);
  const [bootChecked, setBootChecked] = useState(false);

  const load = useCallback(
    async (nextMode = 'unseen') => {
      if (!activeSlug) return [];
      const response = await fetch(
        `/api/admin/whats-new?slug=${encodeURIComponent(activeSlug)}&mode=${encodeURIComponent(nextMode)}`
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) return [];
      return payload.items || [];
    },
    [activeSlug]
  );

  useEffect(() => {
    setBootChecked(false);
    setOpen(false);
    setItems([]);
  }, [activeSlug]);

  useEffect(() => {
    if (!ready || !activeSlug || bootChecked) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const unseen = await load('unseen');
        if (cancelled) return;
        if (unseen.length) {
          setMode('unseen');
          setItems(unseen);
          setOpen(true);
        }
      } catch {
        // ignore — não bloquear Admin
      } finally {
        if (!cancelled) setBootChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, activeSlug, bootChecked, load]);

  useEffect(() => {
    function onOpen(event) {
      const nextMode = event?.detail?.mode === 'all' ? 'all' : 'unseen';
      (async () => {
        try {
          const nextItems = await load(nextMode);
          if (!nextItems.length) return;
          setMode(nextMode);
          setItems(nextItems);
          setOpen(true);
        } catch {
          // ignore
        }
      })();
    }
    window.addEventListener(WHATS_NEW_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WHATS_NEW_OPEN_EVENT, onOpen);
  }, [load]);

  async function ackAndClose(afterAck) {
    if (!activeSlug || !items.length) {
      setOpen(false);
      afterAck?.();
      return;
    }

    setAcknowledging(true);
    try {
      if (mode === 'unseen') {
        await fetch('/api/admin/whats-new/ack', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: activeSlug,
            entryIds: items.map((item) => item.id),
          }),
        });
      }
    } catch {
      // fecha mesmo se ack falhar
    } finally {
      setAcknowledging(false);
      setOpen(false);
      afterAck?.();
    }
  }

  return (
    <WhatsNewModal
      open={open}
      items={items}
      acknowledging={acknowledging}
      onClose={() => ackAndClose()}
      onAckAndClose={ackAndClose}
    />
  );
}
