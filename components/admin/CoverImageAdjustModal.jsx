'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';
import {
  COVER_ASPECT,
  COVER_MOBILE_ASPECT,
  COVER_MOBILE_OUTPUT_HEIGHT,
  COVER_MOBILE_OUTPUT_WIDTH,
  COVER_OUTPUT_HEIGHT,
  COVER_OUTPUT_WIDTH,
  createImage,
  getCenteredCoverCrop,
  getCroppedCoverImage,
  resolveEditableImageSrc,
} from '@/lib/image/coverImage';

const VIEWPORTS = [
  {
    id: 'desktop',
    label: 'Desktop',
    aspect: COVER_ASPECT,
    outputWidth: COVER_OUTPUT_WIDTH,
    outputHeight: COVER_OUTPUT_HEIGHT,
    hint: 'Faixa larga do hero no computador.',
  },
  {
    id: 'mobile',
    label: 'Celular',
    aspect: COVER_MOBILE_ASPECT,
    outputWidth: COVER_MOBILE_OUTPUT_WIDTH,
    outputHeight: COVER_MOBILE_OUTPUT_HEIGHT,
    hint: 'Enquadramento do hero no celular.',
  },
];

function emptyViewportState() {
  return {
    crop: { x: 0, y: 0 },
    zoom: 1,
    croppedAreaPixels: null,
  };
}

export default function CoverImageAdjustModal({ src, onConfirm, onCancel }) {
  const [imageSrc, setImageSrc] = useState('');
  const [activeViewport, setActiveViewport] = useState('desktop');
  const [viewportState, setViewportState] = useState({
    desktop: emptyViewportState(),
    mobile: emptyViewportState(),
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const revokeRef = useRef(null);
  const current = viewportState[activeViewport];
  const activeMeta = VIEWPORTS.find((item) => item.id === activeViewport) || VIEWPORTS[0];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      setActiveViewport('desktop');
      setViewportState({
        desktop: emptyViewportState(),
        mobile: emptyViewportState(),
      });
      setIsDirty(false);

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

  const onCropComplete = useCallback(
    (_croppedArea, croppedAreaPixels) => {
      setViewportState((prev) => ({
        ...prev,
        [activeViewport]: {
          ...prev[activeViewport],
          croppedAreaPixels,
        },
      }));
    },
    [activeViewport]
  );

  const {
    overlayPointerDown,
    overlayClick,
    requestClose,
    discardOpen,
    confirmDiscard,
    cancelDiscard,
  } = useAdminOverlayClose({ onClose: onCancel, isDirty });

  function updateActiveViewport(patch) {
    setViewportState((prev) => ({
      ...prev,
      [activeViewport]: {
        ...prev[activeViewport],
        ...patch,
      },
    }));
    setIsDirty(true);
  }

  async function resolvePixelCrop(viewportId) {
    const meta = VIEWPORTS.find((item) => item.id === viewportId);
    const state = viewportState[viewportId];
    if (state?.croppedAreaPixels?.width && state.croppedAreaPixels.height) {
      return state.croppedAreaPixels;
    }
    const image = await createImage(imageSrc);
    return getCenteredCoverCrop(image, meta.aspect);
  }

  async function handleConfirm() {
    if (!imageSrc) return;
    setSaving(true);
    setError('');
    try {
      const desktopCrop = await resolvePixelCrop('desktop');
      const mobileCrop = await resolvePixelCrop('mobile');
      const [desktop, mobile] = await Promise.all([
        getCroppedCoverImage(imageSrc, desktopCrop, COVER_OUTPUT_WIDTH, COVER_OUTPUT_HEIGHT),
        getCroppedCoverImage(
          imageSrc,
          mobileCrop,
          COVER_MOBILE_OUTPUT_WIDTH,
          COVER_MOBILE_OUTPUT_HEIGHT
        ),
      ]);
      await onConfirm({ desktop, mobile });
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
                Recorte a mesma foto para o computador e para o celular. Arraste, use o zoom e
                posicione dentro da área pontilhada.
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

          <div
            className="admin-tabs admin-tabs-pedidos admin-cover-crop-tabs"
            role="tablist"
            aria-label="Formato da capa"
          >
            {VIEWPORTS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={activeViewport === item.id}
                className={`admin-tab${activeViewport === item.id ? ' active' : ''}`}
                onClick={() => setActiveViewport(item.id)}
              >
                <i
                  className={`ph ${item.id === 'mobile' ? 'ph-device-mobile' : 'ph-desktop'}`}
                  aria-hidden="true"
                />
                {item.label}
              </button>
            ))}
          </div>
          <p className="admin-cover-crop-viewport-hint">{activeMeta.hint}</p>

          {error ? <div className="admin-cover-crop-error">{error}</div> : null}

          <div
            className={`admin-cover-crop-stage${
              activeViewport === 'mobile' ? ' is-mobile' : ''
            }`}
          >
            {loading ? <span className="admin-cover-crop-loading">Carregando imagem…</span> : null}
            {!loading && imageSrc ? (
              <Cropper
                key={activeViewport}
                image={imageSrc}
                crop={current.crop}
                zoom={current.zoom}
                aspect={activeMeta.aspect}
                cropShape="rect"
                showGrid={false}
                zoomWithScroll
                onCropChange={(nextCrop) => updateActiveViewport({ crop: nextCrop })}
                onZoomChange={(nextZoom) => updateActiveViewport({ zoom: nextZoom })}
                onCropComplete={onCropComplete}
                style={{
                  cropAreaStyle: {
                    border: '2px dashed rgba(255, 255, 255, 0.92)',
                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)',
                    background:
                      activeViewport === 'mobile'
                        ? 'linear-gradient(90deg, rgba(0, 0, 0, 0.97) 0%, rgba(0, 0, 0, 0.88) 40%, rgba(0, 0, 0, 0.4) 54%, rgba(0, 0, 0, 0.08) 70%, rgba(0, 0, 0, 0) 80%)'
                        : 'linear-gradient(90deg, rgba(0, 0, 0, 0.96) 0%, rgba(0, 0, 0, 0.72) 36%, rgba(0, 0, 0, 0.22) 62%, rgba(0, 0, 0, 0) 82%)',
                  },
                }}
              />
            ) : null}
          </div>

          <div className="admin-cover-crop-controls">
            <div className="admin-addon-passo-zoom" role="group" aria-labelledby="cover-zoom-label">
              <span className="admin-addon-passo-zoom-label" id="cover-zoom-label">
                Zoom
              </span>
              <div className="admin-addon-passo-zoom-control">
                <button
                  type="button"
                  className="admin-addon-passo-zoom-btn"
                  aria-label="Diminuir zoom"
                  disabled={current.zoom <= 1}
                  onClick={() =>
                    updateActiveViewport({ zoom: Math.max(1, Number((current.zoom - 0.1).toFixed(2))) })
                  }
                >
                  −
                </button>
                <input
                  id="cover-zoom"
                  type="range"
                  className="admin-addon-passo-zoom-slider"
                  min="1"
                  max="3"
                  step="0.01"
                  value={current.zoom}
                  onChange={(e) => updateActiveViewport({ zoom: Number(e.target.value) })}
                  aria-labelledby="cover-zoom-label"
                />
                <button
                  type="button"
                  className="admin-addon-passo-zoom-btn"
                  aria-label="Aumentar zoom"
                  disabled={current.zoom >= 3}
                  onClick={() =>
                    updateActiveViewport({ zoom: Math.min(3, Number((current.zoom + 0.1).toFixed(2))) })
                  }
                >
                  +
                </button>
              </div>
            </div>
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
