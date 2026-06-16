'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import {
  COVER_ASPECT,
  createImage,
  getCroppedCoverImage,
  resolveEditableImageSrc,
} from '@/lib/image/coverImage';

export default function CoverImageAdjustModal({ src, onConfirm, onCancel }) {
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const croppedAreaPixelsRef = useRef(null);
  const revokeRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setIsDirty(false);
      croppedAreaPixelsRef.current = null;

      if (revokeRef.current) {
        revokeRef.current();
        revokeRef.current = null;
      }

      try {
        const resolved = await resolveEditableImageSrc(src);
        if (cancelled) {
          resolved.revoke?.();
          return;
        }
        revokeRef.current = resolved.revoke;
        setImageSrc(resolved.src);
      } catch {
        if (!cancelled) setError('Não foi possível carregar a imagem.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (revokeRef.current) {
        revokeRef.current();
        revokeRef.current = null;
      }
    };
  }, [src]);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    croppedAreaPixelsRef.current = croppedAreaPixels;
  }, []);

  const {
    overlayPointerDown,
    overlayClick,
    requestClose,
    discardOpen,
    confirmDiscard,
    cancelDiscard,
  } = useAdminOverlayClose({ onClose: onCancel, isDirty });

  async function handleConfirm() {
    if (!imageSrc) return;
    setSaving(true);
    setError('');
    try {
      let pixelCrop = croppedAreaPixelsRef.current;
      if (!pixelCrop?.width || !pixelCrop?.height) {
        const image = await createImage(imageSrc);
        const cropWidth = image.naturalWidth;
        const cropHeight = Math.round(cropWidth / COVER_ASPECT);
        const y = Math.max(0, Math.round((image.naturalHeight - cropHeight) / 2));
        pixelCrop = {
          x: 0,
          y,
          width: cropWidth,
          height: Math.min(cropHeight, image.naturalHeight - y),
        };
      }
      const dataUrl = await getCroppedCoverImage(imageSrc, pixelCrop);
      await onConfirm(dataUrl);
    } catch {
      setError('Não foi possível processar a imagem. Tente outro arquivo ou recarregue a página.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="admin-cover-crop-overlay"
        role="presentation"
        onPointerDown={overlayPointerDown}
        onClick={overlayClick}
      >
        <div className="admin-cover-crop-modal" onClick={(e) => e.stopPropagation()}>
          <div className="admin-cover-crop-head">
            <div>
              <h3>Ajustar capa do cardápio</h3>
              <p>
                Arraste a imagem, use o zoom e posicione dentro da área pontilhada. Proporção 5:1
                (1240 × 248 px).
              </p>
            </div>
            <button
              type="button"
              className="admin-order-detail-close"
              onClick={requestClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          {error ? <div className="admin-cover-crop-error">{error}</div> : null}

          <div className="admin-cover-crop-stage">
            {loading ? <span className="admin-cover-crop-loading">Carregando imagem…</span> : null}
            {!loading && imageSrc ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={COVER_ASPECT}
                cropShape="rect"
                showGrid
                zoomWithScroll
                onCropChange={(nextCrop) => {
                  setCrop(nextCrop);
                  setIsDirty(true);
                }}
                onZoomChange={(nextZoom) => {
                  setZoom(nextZoom);
                  setIsDirty(true);
                }}
                onCropComplete={onCropComplete}
                style={{
                  cropAreaStyle: {
                    border: '2px dashed rgba(255, 255, 255, 0.92)',
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)',
                  },
                }}
              />
            ) : null}
          </div>

          <div className="admin-cover-crop-controls">
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
              onChange={(e) => {
                setZoom(Number(e.target.value));
                setIsDirty(true);
              }}
            />
            <span className="admin-cover-crop-zoom-value">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="admin-confirm-actions admin-cover-crop-actions">
            <button type="button" className="admin-btn" onClick={requestClose} disabled={saving}>
              Cancelar
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              onClick={handleConfirm}
              disabled={!imageSrc || loading || saving}
            >
              {saving ? 'Aplicando…' : 'Usar esta capa'}
            </button>
          </div>
        </div>
      </div>
      <AdminDiscardDialog open={discardOpen} onConfirm={confirmDiscard} onCancel={cancelDiscard} />
    </>
  );
}
