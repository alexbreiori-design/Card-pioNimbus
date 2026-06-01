'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  COVER_FRAME_HEIGHT,
  COVER_FRAME_WIDTH,
  loadImageElement,
  renderCoverImage,
} from '@/lib/image/coverImage';

export default function CoverImageAdjustModal({ src, onConfirm, onCancel }) {
  const [image, setImage] = useState(null);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dragRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setError('');
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1);
    loadImageElement(src)
      .then((img) => {
        if (!cancelled) setImage(img);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar a imagem.');
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const baseScale = image
    ? Math.max(COVER_FRAME_WIDTH / image.naturalWidth, COVER_FRAME_HEIGHT / image.naturalHeight)
    : 1;
  const scale = baseScale * zoom;
  const renderedW = image ? image.naturalWidth * scale : 0;
  const renderedH = image ? image.naturalHeight * scale : 0;
  const imgLeft = COVER_FRAME_WIDTH / 2 + offsetX - renderedW / 2;
  const imgTop = COVER_FRAME_HEIGHT / 2 + offsetY - renderedH / 2;

  const onPointerDown = useCallback(
    (e) => {
      if (!image) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: offsetX,
        originY: offsetY,
      };
    },
    [image, offsetX, offsetY]
  );

  const onPointerMove = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setOffsetX(drag.originX + (e.clientX - drag.startX));
    setOffsetY(drag.originY + (e.clientY - drag.startY));
  }, []);

  const onPointerUp = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  async function handleConfirm() {
    if (!image) return;
    setSaving(true);
    setError('');
    try {
      const dataUrl = renderCoverImage(image, {
        frameW: COVER_FRAME_WIDTH,
        frameH: COVER_FRAME_HEIGHT,
        offsetX,
        offsetY,
        zoom,
      });
      await onConfirm(dataUrl);
    } catch {
      setError('Não foi possível processar a imagem.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-confirm-overlay" onClick={onCancel}>
      <div className="admin-cover-adjust-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-cover-adjust-head">
          <div>
            <h3>Ajustar capa do cardápio</h3>
            <p>Arraste para posicionar e use o zoom para ajustar o enquadramento. Proporção 5:1.</p>
          </div>
          <button type="button" className="admin-order-detail-close" onClick={onCancel} aria-label="Fechar">
            ×
          </button>
        </div>

        {error ? <div className="admin-cover-adjust-error">{error}</div> : null}

        <div
          className="admin-cover-adjust-frame"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="presentation"
        >
          {!image ? <span className="admin-cover-adjust-loading">Carregando imagem…</span> : null}
          {image ? (
            <img
              className="admin-cover-adjust-image"
              src={src}
              alt=""
              draggable={false}
              style={{
                width: `${renderedW}px`,
                height: `${renderedH}px`,
                left: `${imgLeft}px`,
                top: `${imgTop}px`,
              }}
            />
          ) : null}
          <div className="admin-cover-adjust-frame-border" aria-hidden="true" />
        </div>

        <div className="admin-cover-adjust-controls">
          <label className="admin-label" htmlFor="cover-zoom">
            Zoom
          </label>
          <input
            id="cover-zoom"
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span className="admin-cover-adjust-zoom-value">{Math.round(zoom * 100)}%</span>
        </div>

        <div className="admin-confirm-actions">
          <button type="button" className="admin-btn" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={handleConfirm} disabled={!image || saving}>
            {saving ? 'Aplicando…' : 'Usar esta capa'}
          </button>
        </div>
      </div>
    </div>
  );
}
