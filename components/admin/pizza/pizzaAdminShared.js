'use client';

import AdminDiscardDialog from '@/components/admin/AdminDiscardDialog';
import { useAdminOverlayClose } from '@/hooks/useAdminOverlayClose';

const MAX_IMAGE_SIZE = 900;
const IMAGE_QUALITY = 0.72;
const MAX_STORED_IMAGE_LENGTH = 280000;

export function sortByOrdem(list) {
  return [...list].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function selectionFrom(value) {
  return {
    categoriaIds: Array.isArray(value?.categoriaIds) ? value.categoriaIds : [],
    itemIds: Array.isArray(value?.itemIds) ? value.itemIds : [],
  };
}

export async function compressImageFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  if (!dataUrl.startsWith('data:image/') || dataUrl.length <= MAX_STORED_IMAGE_LENGTH) return dataUrl;
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  let quality = IMAGE_QUALITY;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (out.length > MAX_STORED_IMAGE_LENGTH && quality > 0.42) {
    quality -= 0.1;
    out = canvas.toDataURL('image/jpeg', quality);
  }
  return out;
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      className={`admin-switch-button ${checked ? 'checked' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function PizzaPhotoField({ imageUrl, label = 'Foto', hint = 'Clique para enviar imagem', onFile }) {
  const src = String(imageUrl || '').trim();
  return (
    <label className={`admin-pizza-photo-field ${src ? 'has-image' : ''}`}>
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      {src ? (
        <img src={src} alt="" />
      ) : (
        <span className="admin-pizza-photo-empty" aria-hidden="true">
          <span className="admin-pizza-photo-glyph">+</span>
          <strong>{label}</strong>
          <small>{hint}</small>
        </span>
      )}
      {src ? <span className="admin-pizza-photo-change">Trocar foto</span> : null}
    </label>
  );
}

export function PizzaCheckPill({ checked, onChange, children, className = '' }) {
  return (
    <label className={`admin-pizza-check-pill ${checked ? 'is-selected' : ''} ${className}`.trim()}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="admin-pizza-check-mark" aria-hidden="true">
        &#10003;
      </span>
      <span className="admin-pizza-check-label">{children}</span>
    </label>
  );
}

export function PizzaEditorShell({
  title,
  subtitle,
  active = true,
  onActiveChange,
  onClose,
  isDirty = false,
  children,
  footer,
}) {
  const {
    overlayPointerDown,
    overlayClick,
    requestClose,
    discardOpen,
    confirmDiscard,
    cancelDiscard,
  } = useAdminOverlayClose({ onClose, isDirty });

  const footerContent =
    typeof footer === 'function' ? footer({ requestClose }) : footer;

  return (
    <>
      <div
        className="overlay open admin-item-overlay"
        role="presentation"
        onPointerDown={overlayPointerDown}
        onClick={overlayClick}
      >
        <div
          className="product-popup admin-product-popup admin-pizza-editor-popup"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="popup-details-col admin-item-form-col">
            <div className="popup-header admin-item-popup-header">
              <div className="admin-modal-title-row">
                <span className="admin-section-icon">PZ</span>
                <div>
                  <div className="popup-header-title">{title}</div>
                  {subtitle ? <div className="popup-header-desc">{subtitle}</div> : null}
                </div>
              </div>
              {onActiveChange ? (
                <div className="admin-inline-switch">
                  <span>Disponível</span>
                  <Switch checked={active} label="Disponibilidade" onChange={onActiveChange} />
                </div>
              ) : null}
            </div>
            <div className="popup-body admin-item-popup-body">{children}</div>
            {footerContent ? (
              <div className="popup-footer admin-pizza-editor-footer">{footerContent}</div>
            ) : null}
          </div>
        </div>
      </div>

      <AdminDiscardDialog
        open={discardOpen}
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    </>
  );
}

export function savePizzaCardapio(saveData, updater) {
  return saveData((prev) => {
    const current = prev.pizzaCardapio || { tamanhos: [], sabores: [], categorias: [] };
    const nextCardapio = updater(current);
    const next = { ...prev };
    delete next.pizzas;
    return { ...next, pizzaCardapio: nextCardapio };
  });
}

export function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(
    String(value || '')
      .replace(/\s/g, '')
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
  );
  return Number.isFinite(parsed) ? parsed : 0;
}
