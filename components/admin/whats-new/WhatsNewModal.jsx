'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import WhatsNewImageSlideshow from './WhatsNewImageSlideshow';

const DEFAULT_DURATION_MS = 8000;

export default function WhatsNewModal({
  open,
  items = [],
  onClose,
  onAckAndClose,
  acknowledging = false,
}) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [progressKey, setProgressKey] = useState(0);

  const { overlayPointerDown, overlayClick } = useAdminOverlayClose({
    onClose: () => onAckAndClose?.(),
    isDirty: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    setProgressKey((key) => key + 1);
  }, [open, items]);

  const active = items[activeIndex] || null;
  const durationMs = Math.max(
    3000,
    (Number(active?.durationSeconds) || 8) * 1000 || DEFAULT_DURATION_MS
  );

  useEffect(() => {
    if (!open || !items.length) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onAckAndClose?.();
      if (event.key === 'ArrowRight') {
        setActiveIndex((index) => Math.min(items.length - 1, index + 1));
        setProgressKey((key) => key + 1);
      }
      if (event.key === 'ArrowLeft') {
        setActiveIndex((index) => Math.max(0, index - 1));
        setProgressKey((key) => key + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items.length, onAckAndClose]);

  useEffect(() => {
    if (!open || !items.length || acknowledging) return undefined;
    const timer = window.setTimeout(() => {
      if (activeIndex >= items.length - 1) {
        onAckAndClose?.();
        return;
      }
      setActiveIndex((index) => index + 1);
      setProgressKey((key) => key + 1);
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [open, items.length, activeIndex, durationMs, acknowledging, onAckAndClose, progressKey]);

  const mediaNode = useMemo(() => {
    const imageUrls =
      Array.isArray(active?.mediaUrls) && active.mediaUrls.length
        ? active.mediaUrls
        : active?.mediaUrl
          ? [active.mediaUrl]
          : [];

    if (active?.mediaType === 'video' && active?.mediaUrl) {
      return (
        <video
          key={active.id}
          className="admin-whats-new-media-el"
          src={active.mediaUrl}
          controls
          playsInline
          preload="metadata"
        />
      );
    }

    if (imageUrls.length) {
      return (
        <WhatsNewImageSlideshow
          key={`${active?.id || 'slide'}-gallery`}
          urls={imageUrls}
          durationMs={durationMs}
          replayKey={progressKey}
        />
      );
    }

    return <div className="admin-whats-new-media-empty">Sem prévia</div>;
  }, [active, durationMs, progressKey]);

  if (!open || !mounted || !items.length) return null;

  function selectIndex(index) {
    setActiveIndex(index);
    setProgressKey((key) => key + 1);
  }

  function goNext() {
    if (activeIndex >= items.length - 1) return;
    setActiveIndex((index) => index + 1);
    setProgressKey((key) => key + 1);
  }

  function handleCta() {
    const href = String(active?.ctaHref || '').trim();
    onAckAndClose?.(() => {
      if (!href) return;
      if (/^https?:\/\//i.test(href)) {
        window.open(href, '_blank', 'noopener,noreferrer');
        return;
      }
      router.push(href.startsWith('/') ? href : `/${href}`);
    });
  }

  const showNext = activeIndex < items.length - 1;

  return createPortal(
    <div
      className="admin-whats-new-overlay"
      role="presentation"
      onPointerDown={overlayPointerDown}
      onClick={overlayClick}
    >
      <div
        className="admin-whats-new-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-whats-new-title"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <aside className="admin-whats-new-sidebar">
          <h2 id="admin-whats-new-title">Novidades</h2>
          <ul className="admin-whats-new-list">
            {items.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={`admin-whats-new-list-item${index === activeIndex ? ' is-active' : ''}`}
                  onClick={() => selectIndex(index)}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ul>
          {showNext ? (
            <div className="admin-whats-new-sidebar-footer">
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-whats-new-next"
                onClick={goNext}
                disabled={acknowledging}
              >
                Próximo
              </button>
            </div>
          ) : null}
        </aside>

        <section className="admin-whats-new-main">
          <button
            type="button"
            className="admin-whats-new-close"
            onClick={() => onAckAndClose?.()}
            aria-label="Fechar novidades"
            disabled={acknowledging}
          >
            ×
          </button>

          <div className="admin-whats-new-media">
            {mediaNode}
            <div
              key={`${active?.id || 'slide'}-${progressKey}`}
              className="admin-whats-new-progress"
              style={{ animationDuration: `${durationMs}ms` }}
              aria-hidden="true"
            />
          </div>

          <div className="admin-whats-new-copy">
            <h3>{active?.title}</h3>
            {active?.description ? <p>{active.description}</p> : null}
            {active?.ctaLabel && active?.ctaHref ? (
              <button
                type="button"
                className="admin-btn admin-btn-primary admin-whats-new-cta"
                onClick={handleCta}
                disabled={acknowledging}
              >
                {active.ctaLabel}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>,
    document.body
  );
}
